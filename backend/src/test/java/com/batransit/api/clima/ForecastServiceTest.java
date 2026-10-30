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

    /** Open-Meteo falso: cuenta las consultas y puede fallar. */
    static class FakeService extends ForecastService {
        final List<String> urls = new ArrayList<>();
        String response;

        FakeService(String response) {
            super("https://api.open-meteo.com/v1/forecast", new ObjectMapper());
            this.response = response;
        }

        @Override
        protected String fetch(String url) {
            urls.add(url);
            if (response == null) {
                throw new IllegalStateException("caido");
            }
            return response;
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
        // Otra celda: otra consulta; si Open-Meteo falla y no hay nada guardado, vacio.
        service.response = null;
        assertThat(service.forecast(-34.60, -58.38).isPresent()).isEqualTo(false);
        // Fuera del AMBA ni se consulta.
        assertThat(service.forecast(-31.42, -64.18).isPresent()).isEqualTo(false);
        assertThat(service.urls.size()).isEqualTo(2);
    }
}
