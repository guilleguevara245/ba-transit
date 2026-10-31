package com.batransit.api.notificaciones;

import com.batransit.api.clima.ForecastService;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Las zonas de una suscripcion a los avisos: Casa, Trabajo y la zona del
 * clima, como celdas de la grilla de 0,05 grados (unos 5 km). Sirven para
 * mandar solo las alertas del SMN que alcanzan a esa persona. Sin zonas,
 * le llegan las de todo el AMBA.
 */
public final class NoticeZones {

    static final Set<String> TYPES = Set.of("casa", "trabajo", "zona");
    static final int MAX_ZONES = 3;

    private NoticeZones() {
    }

    /** Una zona: tipo ('casa', 'trabajo' o 'zona') y el centro de su celda. */
    public record Zone(String tipo, Double lat, Double lon) {
        /** "-34.60,-58.65": la celda, para no consultar dos veces la misma. */
        public String cell() {
            return String.format(Locale.ROOT, "%.2f,%.2f", lat, lon);
        }
    }

    /** Las zonas validas: tipo conocido (una de cada), dentro del AMBA y redondeadas a la grilla. */
    public static List<Zone> sanitize(List<Zone> zones) {
        Map<String, Zone> out = new LinkedHashMap<>();
        for (Zone z : zones == null ? List.<Zone>of() : zones) {
            if (z == null || z.tipo() == null || z.lat() == null || z.lon() == null) {
                continue;
            }
            String tipo = z.tipo().toLowerCase(Locale.ROOT);
            if (!TYPES.contains(tipo) || out.containsKey(tipo) || !ForecastService.inArea(z.lat(), z.lon())) {
                continue;
            }
            out.put(tipo, new Zone(tipo, grid(z.lat()), grid(z.lon())));
            if (out.size() >= MAX_ZONES) {
                break;
            }
        }
        return List.copyOf(out.values());
    }

    /** "casa:-34.60,-58.65;trabajo:-34.55,-58.45", o null si no hay zonas. */
    public static String encode(List<Zone> zones) {
        if (zones == null || zones.isEmpty()) {
            return null;
        }
        List<String> parts = new ArrayList<>();
        for (Zone z : zones) {
            parts.add(z.tipo() + ":" + z.cell());
        }
        return String.join(";", parts);
    }

    /** Lo guardado en la base, de vuelta a zonas (lo que no se entiende se descarta). */
    public static List<Zone> decode(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        List<Zone> zones = new ArrayList<>();
        for (String part : text.split(";")) {
            String[] typeAndPoint = part.split(":", 2);
            if (typeAndPoint.length != 2) {
                continue;
            }
            String[] point = typeAndPoint[1].split(",", 2);
            try {
                zones.add(new Zone(typeAndPoint[0], Double.parseDouble(point[0]), Double.parseDouble(point[1])));
            } catch (NumberFormatException | ArrayIndexOutOfBoundsException e) {
                // zona ilegible: se ignora
            }
        }
        return sanitize(zones);
    }

    private static double grid(double value) {
        return Math.round(value * 20) / 20.0;
    }
}
