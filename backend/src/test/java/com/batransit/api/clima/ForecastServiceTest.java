package com.batransit.api.clima;

import com.batransit.api.clima.ForecastService.Day;
import com.batransit.api.clima.ForecastService.Forecast;
import com.batransit.api.clima.ForecastService.Hour;
import com.batransit.api.estado.SourceHealth;
import com.batransit.api.estado.SourceHealth.Check;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
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

    /**
     * Respuesta de MET Norway (14/11/2026, centro de Buenos Aires), recortada:
     * las primeras horas, y un paso de 6 horas al final como los que vienen
     * despues de los primeros dos dias y medio.
     */
    static String metSample() throws IOException {
        try (InputStream in = ForecastServiceTest.class.getResourceAsStream("/clima/metno-complete.json")) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    /** Proveedores falsos: cuentan las consultas; null = falla. */
    static class FakeService extends ForecastService {
        final List<String> urls = new ArrayList<>();
        String response;
        String met;

        FakeService(String response) {
            super("https://api.open-meteo.com/v1/forecast",
                    "https://api.met.no/weatherapi/locationforecast/2.0/complete", new ObjectMapper());
            this.response = response;
        }

        @Override
        protected String fetch(String url) {
            urls.add(url);
            String body = url.contains("api.met.no") ? met : response;
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
        // Otra celda: si Open-Meteo y MET Norway fallan y no hay nada guardado, vacio.
        service.response = null;
        assertThat(service.forecast(-34.60, -58.38).isPresent()).isEqualTo(false);
        assertThat(service.urls.size()).isEqualTo(3);
        // Fuera del AMBA ni se consulta.
        assertThat(service.forecast(-31.42, -64.18).isPresent()).isEqualTo(false);
        assertThat(service.urls.size()).isEqualTo(3);
    }

    @Test
    void siNingunoRespondeLosDejaDescansar() {
        FakeService service = new FakeService(null);
        assertThat(service.forecast(-34.55, -58.70).isPresent()).isEqualTo(false);
        assertThat(service.urls.size()).isEqualTo(2);
        assertThat(service.isPaused(ForecastService.OPEN_METEO)).isEqualTo(true);
        assertThat(service.isPaused(ForecastService.MET_NORWAY)).isEqualTo(true);
        // Otra celda: los dos estan en pausa, ni se consultan.
        assertThat(service.forecast(-34.60, -58.38).isPresent()).isEqualTo(false);
        assertThat(service.urls.size()).isEqualTo(2);
    }

    @Test
    void siOpenMeteoFallaPideAMetNorway() throws IOException {
        FakeService service = new FakeService(null);
        service.met = metSample();
        assertThat(service.forecast(-34.60, -58.38).isPresent()).isEqualTo(true);
        assertThat(service.urls.size()).isEqualTo(2);
        // A MET Norway tambien se le pide la celda, no el punto exacto.
        assertThat(service.urls.get(1))
                .isEqualTo("https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=-34.60&lon=-58.40");
        // Otra celda: Open-Meteo sigue en pausa, se va directo a MET Norway.
        assertThat(service.forecast(-34.70, -58.50).isPresent()).isEqualTo(true);
        assertThat(service.urls.size()).isEqualTo(3);
        assertThat(service.urls.get(2)).contains("api.met.no");
    }

    @Test
    void alArrancarConsultaElCentro() throws IOException {
        FakeService service = new FakeService(sample());
        service.checkCenter();
        assertThat(service.urls.size()).isEqualTo(1);
        assertThat(service.urls.get(0)).contains("latitude=-34.60&longitude=-58.40");
        // Queda guardado: un usuario del centro no genera otra consulta.
        assertThat(service.forecast(-34.603, -58.381).isPresent()).isEqualTo(true);
        assertThat(service.urls.size()).isEqualTo(1);
    }

    @Test
    void cadaProveedorTieneSuFilaEnElEstado() throws IOException {
        SourceHealth health = new SourceHealth();
        FakeService service = new FakeService(null);
        service.setHealth(health);
        service.met = metSample();
        assertThat(service.forecast(-34.60, -58.38).isPresent()).isEqualTo(true);
        Check openMeteo = health.checks().get(SourceHealth.Source.PRONOSTICO.ordinal());
        Check met = health.checks().get(SourceHealth.Source.PRONOSTICO_RESPALDO.ordinal());
        assertThat(openMeteo.status()).isEqualTo(SourceHealth.Status.ERROR);
        assertThat(openMeteo.lastError()).isEqualTo("IllegalStateException");
        assertThat(met.status()).isEqualTo(SourceHealth.Status.OK);
        // Mientras Open-Meteo esta en pausa no se lo consulta, y eso no cuenta como otra falla.
        service.forecast(-34.70, -58.50);
        assertThat(service.urls.size()).isEqualTo(3);
        assertThat(health.checks().get(SourceHealth.Source.PRONOSTICO.ordinal()).lastFailure())
                .isEqualTo(openMeteo.lastFailure());
    }

    @Test
    void leeMetNorwayEnHoraDeBuenosAires() throws IOException {
        Instant now = Instant.parse("2026-11-14T16:20:00Z");
        Forecast f = ForecastService.parseMet(new ObjectMapper().readTree(metSample()), -34.60, -58.40, now);
        // Ahora: 13:20 en Buenos Aires, el cuarto de hora en curso.
        assertThat(f.current().time()).isEqualTo("2026-11-14T13:15");
        assertThat(f.current().temperature()).isEqualTo(26.5);
        assertThat(f.current().feelsLike()).isEqualTo(27.5);
        // "lightrainshowers" con 0,1 mm: no llega a lluvia, queda parcialmente nublado.
        assertThat(f.current().code()).isEqualTo(2);
        assertThat(f.current().isDay()).isEqualTo(true);
        assertThat(f.current().precipitation()).isEqualTo(0.1);
        // 4,1 m/s son 14,8 km/h.
        assertThat(f.current().wind()).isEqualTo(14.8);
        assertThat(f.current().humidity()).isEqualTo(57);
        // 24 horas desde la hora en curso, en hora local; el paso de 6 horas no entra.
        assertThat(f.hours().size()).isEqualTo(24);
        assertThat(f.hours().get(0).time()).isEqualTo("2026-11-14T13:00");
        assertThat(f.hours().get(23).time()).isEqualTo("2026-11-15T12:00");
        assertThat(f.hours().get(0).rainChance()).isNull();
        // De noche segun el simbolo, y "nublado" de dia segun el sol.
        Hour night = f.hours().get(7);
        assertThat(night.time()).isEqualTo("2026-11-14T20:00");
        assertThat(night.code()).isEqualTo(0);
        assertThat(night.isDay()).isEqualTo(false);
        Hour cloudy = f.hours().get(20);
        assertThat(cloudy.time()).isEqualTo("2026-11-15T09:00");
        assertThat(cloudy.code()).isEqualTo(3);
        assertThat(cloudy.isDay()).isEqualTo(true);
        assertThat(f.hours().get(12).isDay()).isEqualTo(false);
        // Hoy: el pronostico arranca a la tarde, asi que no hay maxima ni minima del dia entero.
        assertThat(f.today().max()).isNull();
        assertThat(f.today().min()).isNull();
        assertThat(f.today().uvMax()).isEqualTo(10.6);
        assertThat(f.today().rainChanceMax()).isNull();
        assertThat(f.today().sunrise()).startsWith("2026-11-14T05:");
        assertThat(f.today().sunset()).startsWith("2026-11-14T19:");
        assertThat(f.today().sunriseTomorrow()).startsWith("2026-11-15T05:");
    }

    @Test
    void deMadrugadaHayMaximaYMinima() throws IOException {
        // A las 2 de la mañana (5 UTC) el pronostico cubre el dia 15 desde la madrugada.
        Instant now = Instant.parse("2026-11-15T05:10:00Z");
        Forecast f = ForecastService.parseMet(new ObjectMapper().readTree(metSample()), -34.60, -58.40, now);
        assertThat(f.hours().get(0).time()).isEqualTo("2026-11-15T02:00");
        assertThat(f.today().max()).isEqualTo(24.4);
        assertThat(f.today().min()).isEqualTo(17.5);
    }

    @Test
    void elSolSaleComoEnOpenMeteo() {
        // Open-Meteo, San Miguel: el 30/10/2026 atardece 19:22 y el 31 amanece 5:54.
        Instant[] day = ForecastService.sunTimes(LocalDate.of(2026, 10, 30), -34.55, -58.70);
        Instant[] next = ForecastService.sunTimes(LocalDate.of(2026, 10, 31), -34.55, -58.70);
        assertThat(minutesApart(day[1], "2026-10-30T22:22:00Z") <= 1).isEqualTo(true);
        assertThat(minutesApart(next[0], "2026-10-31T08:54:00Z") <= 1).isEqualTo(true);
        assertThat(ForecastService.localTime(Instant.parse("2026-10-30T22:22:10Z"))).isEqualTo("2026-10-30T19:22");
    }

    private static long minutesApart(Instant a, String b) {
        return Math.abs(Duration.between(a, Instant.parse(b)).toMinutes());
    }

    @Test
    void losSimbolosDeMetNorwayComoCodigosDeLaOmm() {
        assertThat(ForecastService.wmo("clearsky_night")).isEqualTo(0);
        assertThat(ForecastService.wmo("fair_day")).isEqualTo(1);
        assertThat(ForecastService.wmo("partlycloudy_polartwilight")).isEqualTo(2);
        assertThat(ForecastService.wmo("cloudy")).isEqualTo(3);
        assertThat(ForecastService.wmo("fog")).isEqualTo(45);
        assertThat(ForecastService.wmo("heavyrain")).isEqualTo(65);
        assertThat(ForecastService.wmo("rainshowers_day")).isEqualTo(81);
        assertThat(ForecastService.wmo("heavyrainshowersandthunder_night")).isEqualTo(95);
        assertThat(ForecastService.wmo("lightssnowshowersandthunder_day")).isEqualTo(95);
        assertThat(ForecastService.wmo("snow")).isEqualTo(73);
        assertThat(ForecastService.wmo("")).isEqualTo(3);
        // Con pocos milimetros no es lluvia; con 0,3 o mas, si. Las tormentas siempre.
        assertThat(ForecastService.wmo("lightrainshowers_day", 0.1)).isEqualTo(2);
        assertThat(ForecastService.wmo("lightrain", 0.2)).isEqualTo(3);
        assertThat(ForecastService.wmo("lightrain", 0.3)).isEqualTo(61);
        assertThat(ForecastService.wmo("rainshowersandthunder_day", 0.0)).isEqualTo(95);
        assertThat(ForecastService.wmo("fair_day", 0.0)).isEqualTo(1);
    }

    @Test
    void conservaLaMaximaYLaMinimaDeOpenMeteo() throws IOException {
        Forecast met = ForecastService.parseMet(new ObjectMapper().readTree(metSample()), -34.60, -58.40,
                Instant.parse("2026-11-14T16:20:00Z"));
        Day before = new Day(28.0, 18.0, "2026-11-14T05:45", "2026-11-14T19:50", 11.0, 30, "2026-11-15T05:44");
        Forecast old = new Forecast(-34.60, -58.40, met.current(), met.hours(), before, Instant.EPOCH);
        Day kept = ForecastService.keepDay(met, old).today();
        // La maxima sube con las horas nuevas (28,5 a las 15); la minima de la mañana queda.
        assertThat(kept.max()).isEqualTo(28.5);
        assertThat(kept.min()).isEqualTo(18.0);
        assertThat(kept.uvMax()).isEqualTo(11.0);
        assertThat(kept.rainChanceMax()).isEqualTo(30);
        assertThat(kept.sunset()).isEqualTo(met.today().sunset());
        // De otro dia no sirve.
        Day yesterday = new Day(30.0, 20.0, "2026-11-13T05:46", "2026-11-13T19:49", 11.0, 30, "2026-11-14T05:45");
        Forecast older = new Forecast(-34.60, -58.40, met.current(), met.hours(), yesterday, Instant.EPOCH);
        assertThat(ForecastService.keepDay(met, older).today().max()).isNull();
    }
}
