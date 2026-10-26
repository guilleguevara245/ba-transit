package com.batransit.api.colectivos;

import com.batransit.api.colectivos.BusModels.BusRoute;
import com.batransit.api.config.TransporteApiProperties;
import com.batransit.api.exception.NotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ColectivoServiceTest {

    @TempDir
    Path tmp;

    private ColectivoService loadedService() throws IOException {
        ColectivoService service = new ColectivoService(new TransporteApiProperties(), "", "/colectivos/feed-gtfs");
        service.load(new GtfsColectivosParser().parse(
                GtfsColectivosParserTest.writeZip(tmp, GtfsColectivosParserTest.sampleFeed())));
        return service;
    }

    @Test
    void sinDatosCargadosResponde503() {
        ColectivoService service = new ColectivoService(new TransporteApiProperties(), "", "/colectivos/feed-gtfs");

        assertThat(service.current()).isEmpty();
        assertThatThrownBy(() -> service.search("152")).isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void buscaPorNumeroYPorNombre() throws IOException {
        ColectivoService service = loadedService();

        assertThat(service.search("152")).extracting(BusRoute::id).containsExactly("R152");
        assertThat(service.search("ezeiza")).extracting(BusRoute::id).containsExactly("R8");
        assertThat(service.search("   ")).isEmpty();
    }

    @Test
    void soloPideElFeedSiNoHayDatosOSonViejos() throws IOException {
        ColectivoService empty = new ColectivoService(new TransporteApiProperties(), "", "/colectivos/feed-gtfs");
        assertThat(empty.needsRefresh(Duration.ofHours(24), Instant.now())).isTrue();

        ColectivoService service = loadedService();
        Instant loadedAt = service.current().orElseThrow().loadedAt();
        assertThat(service.needsRefresh(Duration.ofHours(24), loadedAt.plus(Duration.ofHours(2)))).isFalse();
        assertThat(service.needsRefresh(Duration.ofHours(24), loadedAt.plus(Duration.ofHours(25)))).isTrue();
    }

    @Test
    void lineaInexistenteEsNotFound() throws IOException {
        ColectivoService service = loadedService();

        assertThatThrownBy(() -> service.find("NOPE")).isInstanceOf(NotFoundException.class);
        assertThat(service.find("R8").shortName()).isEqualTo("8");
    }

    @Test
    void siElIdDelFeedEnVivoNoEstaBuscaPorNumero() throws IOException {
        ColectivoService service = loadedService();

        assertThat(service.find("ID_VIEJO", "152", null).id()).isEqualTo("R152");
        assertThat(service.find("ID_VIEJO", "8A", null).id()).isEqualTo("R8");
        assertThatThrownBy(() -> service.find("ID_VIEJO", "999", null)).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> service.find("ID_VIEJO", null, null)).isInstanceOf(NotFoundException.class);
    }
}
