package com.batransit.api.colectivos;

import com.batransit.api.colectivos.BusModels.Catalog;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;

/**
 * Guarda en la base una copia de los colectivos ya procesados para no
 * tener que descargar y procesar el feed GTFS cada vez que arranca el
 * servidor (en el plan gratuito de Render se duerme tras unos minutos
 * sin uso y vuelve a arrancar con cada visita).
 *
 * Si la base falla, se loguea y se sigue: la copia es solo un atajo.
 */
@Component
public class ColectivoSnapshotStore {

    private static final Logger log = LoggerFactory.getLogger(ColectivoSnapshotStore.class);

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public ColectivoSnapshotStore(JdbcTemplate jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    public void save(Catalog catalog) {
        try {
            byte[] data = compress(catalog);
            jdbc.update("""
                    INSERT INTO colectivos_snapshot (id, loaded_at, data, updated_at)
                    VALUES (1, ?, ?, now())
                    ON CONFLICT (id) DO UPDATE
                    SET loaded_at = EXCLUDED.loaded_at, data = EXCLUDED.data, updated_at = now()
                    """, Timestamp.from(catalog.loadedAt()), data);
            log.info("Colectivos: copia guardada en la base ({} KB).", data.length / 1024);
        } catch (IOException | DataAccessException e) {
            log.warn("Colectivos: no se pudo guardar la copia en la base ({}).", e.getClass().getSimpleName());
        }
    }

    public Optional<Catalog> load() {
        try {
            List<byte[]> rows = jdbc.query("SELECT data FROM colectivos_snapshot WHERE id = 1",
                    (rs, rowNum) -> rs.getBytes("data"));
            if (rows.isEmpty()) {
                return Optional.empty();
            }
            return Optional.of(decompress(rows.get(0)));
        } catch (IOException | DataAccessException e) {
            log.warn("Colectivos: no se pudo leer la copia de la base ({}).", e.getClass().getSimpleName());
            return Optional.empty();
        }
    }

    byte[] compress(Catalog catalog) throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (OutputStream gzip = new GZIPOutputStream(bytes)) {
            objectMapper.writeValue(gzip, catalog);
        }
        return bytes.toByteArray();
    }

    Catalog decompress(byte[] data) throws IOException {
        try (InputStream gzip = new GZIPInputStream(new ByteArrayInputStream(data))) {
            return objectMapper.readValue(gzip, Catalog.class);
        }
    }
}
