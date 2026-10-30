package com.batransit.api.cuentas;

import com.batransit.api.cuentas.AccountModels.Places;
import com.batransit.api.cuentas.AccountModels.SavedPlace;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Reglas de "Mis lugares": una sola Casa y un solo Trabajo, hasta
 * {@link #MAX_PLACES} lugares, cada uno con una estacion o una direccion.
 * Lo que no cumple se descarta en silencio (el sitio ya valida al guardar).
 */
public final class SavedPlaces {

    static final int MAX_PLACES = 8;
    static final int MAX_NAME = 30;
    static final int MAX_ADDRESS = 120;
    private static final Set<String> TYPES = Set.of("casa", "trabajo", "otro");

    private SavedPlaces() {
    }

    public static Places sanitize(Places places) {
        if (places == null || places.lugares() == null) {
            return Places.empty();
        }
        List<SavedPlace> clean = new ArrayList<>();
        Set<String> uniqueTypes = new HashSet<>();
        for (SavedPlace p : places.lugares()) {
            if (clean.size() >= MAX_PLACES) {
                break;
            }
            SavedPlace ok = clean(p);
            if (ok == null) {
                continue;
            }
            // Casa y Trabajo, una vez cada uno: vale el primero.
            if (!ok.tipo().equals("otro") && !uniqueTypes.add(ok.tipo())) {
                continue;
            }
            clean.add(ok);
        }
        return new Places(List.copyOf(clean));
    }

    static SavedPlace clean(SavedPlace p) {
        if (p == null || p.tipo() == null || !TYPES.contains(p.tipo())) {
            return null;
        }
        Long station = p.estacion() != null && p.estacion() > 0 ? p.estacion() : null;
        String address = text(p.direccion(), MAX_ADDRESS);
        if (station == null && address == null) {
            return null;
        }
        String name = switch (p.tipo()) {
            case "casa" -> "Casa";
            case "trabajo" -> "Trabajo";
            default -> {
                String n = text(p.nombre(), MAX_NAME);
                yield n == null ? "Lugar" : n;
            }
        };
        // Si tiene estacion, la direccion sobra: se usa la estacion.
        return new SavedPlace(p.tipo(), name, station, station == null ? address : null);
    }

    /** Sin caracteres de control, espacios de mas ni texto vacio; recortado a max. */
    static String text(String value, int max) {
        if (value == null) {
            return null;
        }
        String t = value.replaceAll("\\p{Cntrl}", " ").replaceAll("\\s+", " ").trim();
        if (t.isEmpty()) {
            return null;
        }
        return t.length() > max ? t.substring(0, max).trim() : t;
    }
}
