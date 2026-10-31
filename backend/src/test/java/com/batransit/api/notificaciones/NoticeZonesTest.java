package com.batransit.api.notificaciones;

import com.batransit.api.notificaciones.NoticeZones.Zone;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class NoticeZonesTest {

    @Test
    void guardaSoloLaCeldaYUnaDeCadaTipo() {
        List<Zone> zones = NoticeZones.sanitize(Arrays.asList(
                new Zone("Casa", -34.5891, -58.6392),
                new Zone("casa", -34.60, -58.40),          // repetida: vale la primera
                new Zone("trabajo", -34.6037, -58.3816),
                new Zone("oficina", -34.60, -58.40),       // tipo desconocido
                new Zone("zona", -32.95, -60.65),          // Rosario: fuera del AMBA
                null));
        assertThat(zones.size()).isEqualTo(2);
        assertThat(zones.get(0)).isEqualTo(new Zone("casa", -34.6, -58.65));
        assertThat(zones.get(1)).isEqualTo(new Zone("trabajo", -34.6, -58.4));
    }

    @Test
    void codificaYDecodifica() {
        List<Zone> zones = List.of(new Zone("casa", -34.6, -58.65), new Zone("zona", -34.55, -58.45));
        String text = NoticeZones.encode(zones);
        assertThat(text).isEqualTo("casa:-34.60,-58.65;zona:-34.55,-58.45");
        assertThat(NoticeZones.decode(text)).isEqualTo(zones);
        assertThat(NoticeZones.encode(List.of())).isNull();
        assertThat(NoticeZones.decode(null).isEmpty()).isTrue();
        assertThat(NoticeZones.decode("casa:basura;trabajo").isEmpty()).isTrue();
    }
}
