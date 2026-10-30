package com.batransit.api.cuentas;

import com.batransit.api.cuentas.AccountModels.Places;
import com.batransit.api.cuentas.AccountModels.SavedPlace;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Reglas de Mis lugares. */
class SavedPlacesTest {

    private static Places of(SavedPlace... places) {
        return new Places(Arrays.asList(places));
    }

    @Test
    void casaYTrabajoUnaVezCadaUno() {
        Places clean = SavedPlaces.sanitize(of(
                new SavedPlace("casa", "x", 10L, null),
                new SavedPlace("casa", null, 11L, null),
                new SavedPlace("trabajo", null, null, "Av. Corrientes 1500"),
                new SavedPlace("otro", "Club", 12L, null),
                new SavedPlace("otro", "Facu", 13L, null)));
        assertThat(clean.lugares()).isEqualTo(List.of(
                new SavedPlace("casa", "Casa", 10L, null),
                new SavedPlace("trabajo", "Trabajo", null, "Av. Corrientes 1500"),
                new SavedPlace("otro", "Club", 12L, null),
                new SavedPlace("otro", "Facu", 13L, null)));
    }

    @Test
    void descartaLoInvalido() {
        Places clean = SavedPlaces.sanitize(of(
                null,
                new SavedPlace("gimnasio", "G", 1L, null),
                new SavedPlace("otro", "Sin nada", null, "   "),
                new SavedPlace("otro", "Negativa", -4L, null),
                new SavedPlace("otro", "  ", 5L, "Calle 1")));
        // Sin nombre queda "Lugar"; con estacion, la direccion sobra.
        assertThat(clean.lugares()).isEqualTo(List.of(new SavedPlace("otro", "Lugar", 5L, null)));
        assertThat(SavedPlaces.sanitize(null).lugares()).isEqualTo(List.of());
        assertThat(SavedPlaces.sanitize(new Places(null)).lugares()).isEqualTo(List.of());
    }

    @Test
    void recortaTextosYCantidad() {
        String largo = "a".repeat(200);
        SavedPlace p = SavedPlaces.clean(new SavedPlace("otro", "Mi\n  lugar\t" + largo, null, "Calle\u0000 " + largo));
        assertThat(p.nombre().length()).isEqualTo(SavedPlaces.MAX_NAME);
        assertThat(p.nombre().startsWith("Mi lugar a")).isEqualTo(true);
        assertThat(p.direccion().length()).isEqualTo(SavedPlaces.MAX_ADDRESS);
        assertThat(p.direccion().startsWith("Calle a")).isEqualTo(true);

        List<SavedPlace> muchos = new ArrayList<>();
        for (long i = 1; i <= 20; i++) {
            muchos.add(new SavedPlace("otro", "L" + i, i, null));
        }
        assertThat(SavedPlaces.sanitize(new Places(muchos)).lugares().size()).isEqualTo(SavedPlaces.MAX_PLACES);
    }
}
