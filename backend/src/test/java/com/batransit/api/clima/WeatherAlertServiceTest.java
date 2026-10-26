package com.batransit.api.clima;

import com.batransit.api.clima.CapParser.CapAlert;
import com.batransit.api.clima.WeatherAlertService.WeatherAlert;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;

import static com.batransit.api.clima.CapParserTest.AMBA_POLYGON;
import static com.batransit.api.clima.CapParserTest.MENDOZA_POLYGON;
import static com.batransit.api.clima.CapParserTest.cap;
import static org.assertj.core.api.Assertions.assertThat;

class WeatherAlertServiceTest {

    private static final OffsetDateTime NOW = OffsetDateTime.parse("2026-10-25T22:00:00-03:00");
    private static final String LATER = "2026-10-26T06:00:00-03:00";

    private static CapAlert parse(String xml) {
        return CapParser.parseAlert(xml).orElseThrow();
    }

    @Test
    void soloLasVigentesDelAmba() {
        List<WeatherAlert> alerts = WeatherAlertService.select(List.of(
                parse(cap("A1", "Alert", "", "Tormentas", "Alerta amarilla por tormentas", "Moderate", LATER,
                        "Zona sin nombre", AMBA_POLYGON)),
                parse(cap("A2", "Alert", "", "Viento Zonda", "Alerta naranja por viento", "Severe", LATER,
                        "Mendoza", MENDOZA_POLYGON)),
                parse(cap("A3", "Alert", "", "Lluvias", "Alerta amarilla por lluvias", "Moderate",
                        "2026-10-25T20:00:00-03:00", "Ciudad Autonoma de Buenos Aires", AMBA_POLYGON))),
                NOW);

        assertThat(alerts).extracting(WeatherAlert::id).containsExactly("A1");
    }

    @Test
    void unaActualizacionReemplazaALaAnteriorYUnaCancelacionLaSaca() {
        String ref = "<references>smn.gob.ar,A1,2026-10-25T18:00:00-03:00</references>";
        List<WeatherAlert> updated = WeatherAlertService.select(List.of(
                parse(cap("A1", "Alert", "", "Tormentas", "Alerta amarilla por tormentas", "Moderate", LATER,
                        "Conurbano", AMBA_POLYGON)),
                parse(cap("A2", "Update", ref, "Tormentas", "Alerta naranja por tormentas", "Severe", LATER,
                        "Conurbano", AMBA_POLYGON))),
                NOW);
        assertThat(updated).extracting(WeatherAlert::id, WeatherAlert::level).containsExactly(
                org.assertj.core.groups.Tuple.tuple("A2", "NARANJA"));

        List<WeatherAlert> cancelled = WeatherAlertService.select(List.of(
                parse(cap("A1", "Alert", "", "Tormentas", "Alerta amarilla por tormentas", "Moderate", LATER,
                        "Conurbano", AMBA_POLYGON)),
                parse(cap("A3", "Cancel", ref, "Tormentas", "Fin de la alerta", "Minor", LATER,
                        "Conurbano", AMBA_POLYGON))),
                NOW);
        assertThat(cancelled).isEmpty();
    }
}
