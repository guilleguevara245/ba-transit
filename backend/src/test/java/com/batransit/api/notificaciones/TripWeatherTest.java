package com.batransit.api.notificaciones;

import com.batransit.api.clima.ForecastService.Forecast;
import com.batransit.api.clima.ForecastService.Hour;
import com.batransit.api.notificaciones.TripWeather.Place;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class TripWeatherTest {

    static final String SITE = "https://ba-transit.onrender.com";
    static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 30, 7, 0);

    /** Un dia tranquilo de 7 a 23, con cambios en algunas horas. */
    static Forecast day(java.util.function.IntFunction<Hour> override) {
        List<Hour> hours = new ArrayList<>();
        for (int h = 7; h <= 23; h++) {
            Hour custom = override.apply(h);
            hours.add(custom != null ? custom : hour(h, 20, 10, 0, 1, 12));
        }
        return new Forecast(-34.6, -58.4, null, hours, null, null);
    }

    static Hour hour(int h, double feels, Integer chance, double rain, int code, double wind) {
        return new Hour(String.format("2026-10-30T%02d:00", h), feels, feels, chance, rain, code, wind, true);
    }

    @Test
    void diaTranquiloNoAvisa() {
        assertThat(TripWeather.plan(List.of(new Place("Casa", day(h -> null))), NOW, SITE).isPresent()).isFalse();
    }

    @Test
    void lluviaALaVueltaEnTrabajo() {
        Place casa = new Place("Casa", day(h -> null));
        Place trabajo = new Place("Trabajo", day(h -> h == 18 ? hour(18, 19, 70, 1.2, 61, 15) : null));
        PushMessage m = TripWeather.plan(List.of(casa, trabajo), NOW, SITE).orElseThrow();
        assertThat(m.title()).isEqualTo("Llevá paraguas");
        assertThat(m.body()).isEqualTo("Lluvia en Trabajo a las 18 h (70 %). Salí con tiempo: puede haber demoras.");
        assertThat(m.icon()).isEqualTo(SITE + "/notif/clima-lluvias.png");
        assertThat(m.tag()).isEqualTo("viaje-clima");
    }

    @Test
    void laTormentaGanaALaLluviaYNoCuentaLoDeManana() {
        Place casa = new Place("Casa", day(h -> h == 8 ? hour(8, 18, 60, 2, 63, 20) : h == 22 ? hour(22, 18, 90, 5, 95, 30) : null));
        Place trabajo = new Place("Trabajo", day(h -> h == 16 ? hour(16, 22, 80, 3, 95, 25) : null));
        PushMessage m = TripWeather.plan(List.of(casa, trabajo), NOW, SITE).orElseThrow();
        assertThat(m.title()).isEqualTo("Tormenta para tu viaje");
        assertThat(m.body()).isEqualTo("Tormenta en Trabajo a las 16 h. Salí con tiempo: puede haber demoras.");
    }

    @Test
    void calorFrioYViento() {
        Optional<PushMessage> hot = TripWeather.plan(List.of(new Place("Casa", day(h -> h == 15 ? hour(15, 34.4, 5, 0, 1, 10) : null))), NOW, SITE);
        assertThat(hot.orElseThrow().body()).isEqualTo("Hasta 34° de sensación en Casa a las 15 h. Llevá agua.");

        Optional<PushMessage> cold = TripWeather.plan(List.of(new Place("tu zona", day(h -> h == 7 ? hour(7, 3.2, 0, 0, 0, 5) : null))), NOW, SITE);
        assertThat(cold.orElseThrow().body()).isEqualTo("3° de sensación en tu zona a las 7 h. Abrigate.");

        Optional<PushMessage> windy = TripWeather.plan(List.of(new Place("Trabajo", day(h -> h == 19 ? hour(19, 20, 10, 0, 3, 48) : null))), NOW, SITE);
        assertThat(windy.orElseThrow().title()).isEqualTo("Viento fuerte hoy");
        assertThat(windy.orElseThrow().icon()).isEqualTo(SITE + "/notif/clima-viento.png");
    }

    @Test
    void sinPronosticoNoAvisa() {
        assertThat(TripWeather.plan(List.of(), NOW, SITE).isPresent()).isFalse();
        assertThat(TripWeather.plan(List.of(new Place("Casa", null)), NOW, SITE).isPresent()).isFalse();
    }
}
