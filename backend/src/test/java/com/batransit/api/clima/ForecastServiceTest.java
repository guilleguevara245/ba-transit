package com.batransit.api.clima;

import com.batransit.api.clima.ForecastService.Forecast;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ForecastServiceTest {

    /** Respuesta real de Open-Meteo (30/10/2026, San Miguel), grabada. */
    static String sample() throws IOException {
        try (InputStream in = ForecastServiceTest.class.getResourceAsStream("/clima/open-meteo.json")) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    static String metSample() throws IOException {
        try (InputStream in = ForecastServiceTest.class.getResourceAsStream("/clima/met-norway.json")) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    /** Proveedores falsos: cuenta las consultas; null = ese proveedor falla. */
    static class FakeService extends ForecastService {
        final List<String> urls = new ArrayList<>();
        String response;
        String metResponse;

        FakeService(String response) {
            super("https://api.open-meteo.com/v1/forecast", new ObjectMapper());
            this.response = response;
        }

        @Override
        protected String fetch(String url) {
            urls.add(url);
            String body = url.startsWith(MetNorwayForecast.URL) ? metResponse : response;
            if (body == null) {
                throw new IllegalStateException("caido");
            }
            return body;
        }
    }

    @Test
    void leeLaRespuestaDesdeLaHoraActual() throws IOException {
        Forecast f = ForecastService.parse(new ObjectMapper().readTree(sample()), -34.55, -58.70, Instant.EPOCH);
        assertThat(f.current().time()).isEqualTo("2026-10-30T18:30");
        assertThat(f.current().temperature()).isEqualTo(17.3);
        assertThat(f.current().code()).isEqualTo(51);
        assertThat(f.current().isDay()).isEqualTo(true);
        // Las horas arrancan en la hora en curso (18:00) y siguen 24.
        assertThat(f.hours().get(0).time()).isEqualTo("2026-10-30T18:00");
        assertThat(f.hours().size()).isEqualTo(24);
        assertThat(f.hours().get(23).time()).isEqualTo("2026-10-31T17:00");
        assertThat(f.today().max()).isEqualTo(22.1);
        assertThat(f.today().sunset()).isEqualTo("2026-10-30T19:22");
        assertThat(f.today().rainChanceMax()).isEqualTo(98);
        assertThat(f.today().sunriseTomorrow()).isEqualTo("2026-10-31T05:54");
    }

    @Test
    void grillaDeCincoKilometrosYSoloElAmba() {
        assertThat(ForecastService.cellKey(-34.5512, -58.7234)).isEqualTo("-34.55,-58.70");
        assertThat(ForecastService.cellKey(-34.6037, -58.3816)).isEqualTo("-34.60,-58.40");
        assertThat(ForecastService.inArea(-34.60, -58.38)).isEqualTo(true);
        assertThat(ForecastService.inArea(-31.42, -64.18)).isEqualTo(false); // Cordoba
    }

    @Test
    void unaConsultaPorCeldaYLoViejoSiFalla() throws IOException {
        FakeService service = new FakeService(sample());
        assertThat(service.forecast(-34.551, -58.702).isPresent()).isEqualTo(true);
        // Otro punto de la misma celda: no se vuelve a consultar.
        assertThat(service.forecast(-34.549, -58.698).isPresent()).isEqualTo(true);
        assertThat(service.urls.size()).isEqualTo(1);
        // La consulta lleva la celda, no el punto exacto.
        assertThat(service.urls.get(0)).contains("latitude=-34.55&longitude=-58.70");
        // Otra celda: si Open-Meteo y el respaldo fallan y no hay nada guardado, vacio.
        service.response = null;
        assertThat(service.forecast(-34.60, -58.38).isPresent()).isEqualTo(false);
        assertThat(service.urls.size()).isEqualTo(3);
        // Fuera del AMBA ni se consulta.
        assertThat(service.forecast(-31.42, -64.18).isPresent()).isEqualTo(false);
        assertThat(service.urls.size()).isEqualTo(3);
    }

    @Test
    void respaldoDeMetNorwayEnElMismoFormato() throws IOException {
        Forecast f = MetNorwayForecast.parse(new ObjectMapper().readTree(metSample()), -34.55, -58.70, Instant.EPOCH);
        // 21:00 UTC = 18:00 en Buenos Aires.
        assertThat(f.current().time()).isEqualTo("2026-10-30T18:00");
        assertThat(f.current().temperature()).isEqualTo(17.1);
        assertThat(f.current().code()).isEqualTo(3);
        // Viento en km/h (3 m/s = 10,8 km/h).
        assertThat(Math.round(f.current().wind() * 10) / 10.0).isEqualTo(10.8);
        assertThat(f.hours().get(1).code()).isEqualTo(61);
        assertThat(f.hours().get(1).rain()).isEqualTo(0.6);
        assertThat(f.hours().get(2).code()).isEqualTo(95); // lluvia con tormenta
        assertThat(f.hours().get(3).isDay()).isEqualTo(false);
        // Solo las horas con dato horario (la de cada 6 horas no entra en la tira).
        assertThat(f.hours().size()).isEqualTo(4);
        assertThat(f.today().max()).isEqualTo(17.1);
        // 00:00 UTC del 31 todavia es el 30 en Buenos Aires (21 h).
        assertThat(f.today().min()).isEqualTo(15.2);
        assertThat(f.current().humidity()).isEqualTo(88);
    }

    @Test
    void siOpenMeteoFallaUsaElRespaldoYLoDejaDescansar() throws IOException {
        FakeService service = new FakeService(null);
        service.metResponse = metSample();
        assertThat(service.forecast(-34.55, -58.70).isPresent()).isEqualTo(true);
        assertThat(service.urls.size()).isEqualTo(2); // Open-Meteo (fallo) y MET
        assertThat(service.isPaused(ForecastService.OPEN_METEO)).isEqualTo(true);
        // Otra celda: Open-Meteo esta en pausa, se va directo al respaldo.
        assertThat(service.forecast(-34.60, -58.38).isPresent()).isEqualTo(true);
        assertThat(service.urls.size()).isEqualTo(3);
        assertThat(service.urls.get(2)).contains("api.met.no");
        // Si los dos fallan y no hay nada guardado: vacio.
        service.metResponse = null;
        assertThat(service.forecast(-34.80, -58.50).isPresent()).isEqualTo(false);
    }
}
