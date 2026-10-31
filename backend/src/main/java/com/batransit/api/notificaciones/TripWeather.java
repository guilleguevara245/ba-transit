package com.batransit.api.notificaciones;

import com.batransit.api.clima.ForecastService.Forecast;
import com.batransit.api.clima.ForecastService.Hour;

import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.function.Predicate;

/**
 * "El clima y tu viaje": decide si hoy conviene avisar por el clima en
 * Casa o Trabajo y arma el aviso. Mira las horas desde ahora hasta las 21
 * y elige lo mas importante: tormenta, lluvia, calor, frio o viento (los
 * mismos umbrales que "Tu dia" en el sitio). Sin nada de eso, no avisa.
 * Sin base de datos ni red.
 */
public final class TripWeather {

    static final Set<Integer> STORM = Set.of(95, 96, 99);
    static final Set<Integer> RAIN = Set.of(51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82);
    static final int RAIN_CHANCE = 50;
    static final double HOT = 32;
    static final double COLD = 5;
    static final double WINDY = 40;
    /** Hasta que hora del dia se mira (la vuelta a casa). */
    static final int LAST_HOUR = 21;

    private TripWeather() {
    }

    /** Un lugar con su pronostico. label: "Casa", "Trabajo" o "tu zona". */
    public record Place(String label, Forecast forecast) {
    }

    private record Moment(Place place, Hour hour, int clock) {
    }

    /** El aviso de hoy, o vacio si el clima no complica el viaje. */
    public static Optional<PushMessage> plan(List<Place> places, LocalDateTime now, String siteUrl) {
        List<Moment> moments = new ArrayList<>();
        for (Place place : places) {
            if (place.forecast() == null || place.forecast().hours() == null) {
                continue;
            }
            for (Hour h : place.forecast().hours()) {
                LocalDateTime at = parse(h.time());
                if (at != null && at.toLocalDate().equals(now.toLocalDate()) && at.getHour() >= now.getHour()
                        && at.getHour() <= LAST_HOUR) {
                    moments.add(new Moment(place, h, at.getHour()));
                }
            }
        }
        if (moments.isEmpty()) {
            return Optional.empty();
        }
        moments.sort(Comparator.comparingInt(Moment::clock));

        Optional<Moment> storm = first(moments, h -> STORM.contains(h.code()));
        if (storm.isPresent()) {
            Moment m = storm.get();
            return Optional.of(message("Tormenta para tu viaje",
                    "Tormenta en " + m.place().label() + " a las " + m.clock() + " h. Salí con tiempo: puede haber demoras.",
                    "tormentas", siteUrl));
        }
        Optional<Moment> rain = first(moments, TripWeather::isRainy);
        if (rain.isPresent()) {
            Moment m = rain.get();
            String chance = m.hour().rainChance() == null ? "" : " (" + m.hour().rainChance() + " %)";
            return Optional.of(message("Llevá paraguas",
                    "Lluvia en " + m.place().label() + " a las " + m.clock() + " h" + chance
                            + ". Salí con tiempo: puede haber demoras.",
                    "lluvias", siteUrl));
        }
        Moment hottest = moments.stream().max(Comparator.comparingDouble(m -> m.hour().feelsLike())).orElseThrow();
        if (hottest.hour().feelsLike() >= HOT) {
            return Optional.of(message("Mucho calor hoy",
                    "Hasta " + Math.round(hottest.hour().feelsLike()) + "° de sensación en " + hottest.place().label()
                            + " a las " + hottest.clock() + " h. Llevá agua.",
                    "calor", siteUrl));
        }
        Moment coldest = moments.stream().min(Comparator.comparingDouble(m -> m.hour().feelsLike())).orElseThrow();
        if (coldest.hour().feelsLike() <= COLD) {
            return Optional.of(message("Mucho frío hoy",
                    Math.round(coldest.hour().feelsLike()) + "° de sensación en " + coldest.place().label() + " a las "
                            + coldest.clock() + " h. Abrigate.",
                    "frio", siteUrl));
        }
        Moment windiest = moments.stream().max(Comparator.comparingDouble(m -> m.hour().wind())).orElseThrow();
        if (windiest.hour().wind() >= WINDY) {
            return Optional.of(message("Viento fuerte hoy",
                    "Ráfagas de " + Math.round(windiest.hour().wind()) + " km/h en " + windiest.place().label()
                            + " a las " + windiest.clock() + " h.",
                    "viento", siteUrl));
        }
        return Optional.empty();
    }

    /** Lluvia probable: probabilidad alta, milimetros o codigo de lluvia con probabilidad media. */
    static boolean isRainy(Hour h) {
        int chance = h.rainChance() == null ? 0 : h.rainChance();
        return chance >= RAIN_CHANCE || h.rain() >= 0.3 || (RAIN.contains(h.code()) && chance >= 40);
    }

    private static Optional<Moment> first(List<Moment> moments, Predicate<Hour> test) {
        return moments.stream().filter(m -> test.test(m.hour())).findFirst();
    }

    private static PushMessage message(String title, String body, String icon, String siteUrl) {
        return new PushMessage(title, body, siteUrl + "/notif/clima-" + icon + ".png", siteUrl + "/", "viaje-clima",
                "Ver Tu día", false);
    }

    private static LocalDateTime parse(String time) {
        try {
            return time == null ? null : LocalDateTime.parse(time);
        } catch (DateTimeParseException e) {
            return null;
        }
    }
}
