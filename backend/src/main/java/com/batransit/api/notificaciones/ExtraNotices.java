package com.batransit.api.notificaciones;

import com.batransit.api.clima.WeatherAlertService.WeatherAlert;
import com.batransit.api.domain.SpecialServiceKind;
import com.batransit.api.domain.TransportMode;
import com.batransit.api.notificaciones.NotificationPlanner.Planned;
import com.batransit.api.notificaciones.NotificationTexts.LineInfo;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Los avisos que no salen de las alertas de las lineas: alertas del clima
 * (SMN), cambios de tarifa, servicios especiales de las lineas favoritas y
 * el ultimo tren del subte y el Premetro. Como NotificationPlanner, sin
 * base de datos ni red: recibe los datos y devuelve los avisos.
 */
public final class ExtraNotices {

    private ExtraNotices() {
    }

    /**
     * Lo que hace falta de una suscripcion. lines: sus lineas favoritas mas
     * las lineas de sus estaciones favoritas; kinds: tipos de aviso elegidos;
     * lastTrainMinutes: cuanto antes del ultimo tren (null = no).
     */
    public record Target(long id, Set<Long> lines, Set<String> kinds, Integer lastTrainMinutes) {
    }

    /** Separador entre el precio de antes y el nuevo: los chevrones del sitio. */
    static final String CHEVRONS = " ››› ";
    private static final Locale ES = Locale.forLanguageTag("es-AR");
    private static final String[] WEEKDAYS = {"lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"};
    private static final DateTimeFormatter DAY_KEY = DateTimeFormatter.BASIC_ISO_DATE;

    // ---- Clima ----

    static final Map<String, String> WEATHER_KINDS = Map.of("TORMENTAS", "tormentas", "LLUVIAS", "lluvias", "CALOR", "calor extremo");
    static final Map<String, String> WEATHER_LEVELS = Map.of("AMARILLA", "amarilla", "NARANJA", "naranja", "ROJA", "roja");

    /**
     * Un aviso por alerta vigente, a quien eligio "clima". La clave lleva
     * tipo, nivel y dia: las actualizaciones del mismo nivel no se repiten,
     * pero si sube de amarilla a naranja se avisa de nuevo.
     */
    public static List<Planned> weather(List<WeatherAlert> alerts, List<Target> targets, String siteUrl, ZonedDateTime now) {
        List<Planned> out = new ArrayList<>();
        for (WeatherAlert a : alerts) {
            if (a.expires() != null && !a.expires().toInstant().isAfter(now.toInstant())) {
                continue;
            }
            OffsetDateTime start = a.onset() != null && a.onset().toInstant().isAfter(now.toInstant()) ? a.onset() : null;
            LocalDate day = (start != null ? start.atZoneSameInstant(now.getZone()) : now).toLocalDate();
            String key = "clima:" + a.kind() + ":" + a.level() + ":" + day.format(DAY_KEY);
            String kind = a.kind().toLowerCase(Locale.ROOT);
            PushMessage message = new PushMessage(weatherTitle(a), weatherBody(a, now),
                    siteUrl + "/notif/clima-" + kind + ".png", siteUrl + "/", "clima-" + kind, "Abrir BA Transit", false);
            for (Target t : targets) {
                if (t.kinds().contains("clima")) {
                    out.add(new Planned(t.id(), key, message));
                }
            }
        }
        return out;
    }

    /** "Alerta amarilla por tormentas". */
    static String weatherTitle(WeatherAlert a) {
        String level = WEATHER_LEVELS.get(a.level());
        String kind = WEATHER_KINDS.get(a.kind());
        String base = level == null ? "Alerta" : "Alerta " + level;
        return kind == null ? (a.title() == null || a.title().isBlank() ? base : a.title()) : base + " por " + kind;
    }

    /** "Rige hasta las 21:00. Si vas a viajar, llevá paraguas..." o "Desde mañana a las 9:00 hasta las 18:00. Si viajás mañana, ...". */
    static String weatherBody(WeatherAlert a, ZonedDateTime now) {
        boolean future = a.onset() != null && a.onset().toInstant().isAfter(now.toInstant());
        StringBuilder sb = new StringBuilder();
        if (future) {
            sb.append("Desde ").append(when(a.onset(), now));
            if (a.expires() != null) {
                sb.append(" hasta ").append(when(a.expires(), now));
            }
            sb.append(". ");
        } else if (a.expires() != null) {
            sb.append("Rige hasta ").append(when(a.expires(), now)).append(". ");
        }
        String tip = "CALOR".equals(a.kind()) ? "llevá agua y evitá el sol del mediodía."
                : "llevá paraguas y salí con tiempo: puede haber demoras.";
        String lead = "Si vas a viajar";
        if (future) {
            LocalDate start = a.onset().atZoneSameInstant(now.getZone()).toLocalDate();
            if (start.equals(now.toLocalDate())) {
                lead = "Si viajás hoy";
            } else if (start.equals(now.toLocalDate().plusDays(1))) {
                lead = "Si viajás mañana";
            }
        }
        return NotificationTexts.shorten(sb + lead + ", " + tip);
    }

    /** "las 21:00", "mañana a las 21:00" o "el martes a las 21:00". */
    static String when(OffsetDateTime at, ZonedDateTime now) {
        ZonedDateTime local = at.atZoneSameInstant(now.getZone());
        String time = String.format("las %d:%02d", local.getHour(), local.getMinute());
        LocalDate day = local.toLocalDate();
        if (day.equals(now.toLocalDate())) {
            return time;
        }
        if (day.equals(now.toLocalDate().plusDays(1))) {
            return "mañana a " + time;
        }
        return "el " + WEEKDAYS[day.getDayOfWeek().getValue() - 1] + " a " + time;
    }

    // ---- Tarifas ----

    /** Una tarifa activa, con lo justo para elegir el boleto de referencia de cada modo. */
    public record FareRow(TransportMode mode, String jurisdiction, BigDecimal minKm, Short section, Short tripsFrom,
                          BigDecimal price, LocalDate effectiveFrom) {
    }

    public record FareChange(String label, BigDecimal before, BigDecimal after) {
    }

    /**
     * El boleto de referencia de cada modo (el que paga la mayoria): subte
     * de 1 a 20 viajes, el primer tramo de cada colectivo, la primera
     * seccion del tren y el Premetro. Ordenado, para comparar y guardar.
     */
    public static Map<String, BigDecimal> referenceFares(List<FareRow> rows) {
        Map<String, BigDecimal> out = new LinkedHashMap<>();
        String[] order = {"Subte", "Colectivo nacional", "Colectivo de la Ciudad", "Colectivo de la Provincia", "Tren", "Premetro"};
        Map<String, BigDecimal> found = new LinkedHashMap<>();
        for (FareRow r : rows) {
            String label = switch (r.mode()) {
                case SUBTE -> r.tripsFrom() == null || r.tripsFrom() <= 1 ? "Subte" : null;
                case PREMETRO -> "Premetro";
                case TREN -> r.section() == null || r.section() <= 1 ? "Tren" : null;
                case COLECTIVO -> {
                    boolean first = r.minKm() == null || r.minKm().signum() == 0;
                    String j = r.jurisdiction() == null ? "NACIONAL" : r.jurisdiction();
                    yield !first ? null : switch (j) {
                        case "CABA" -> "Colectivo de la Ciudad";
                        case "PROVINCIA" -> "Colectivo de la Provincia";
                        default -> "Colectivo nacional";
                    };
                }
                default -> null;
            };
            if (label != null && r.price() != null) {
                found.merge(label, r.price(), BigDecimal::min);
            }
        }
        for (String label : order) {
            if (found.containsKey(label)) {
                out.put(label, found.get(label).setScale(2, RoundingMode.HALF_UP));
            }
        }
        return out;
    }

    /** "Subte=1453.60;Tren=450.00" (lo que se guarda para comparar en la proxima vuelta). */
    public static String encode(Map<String, BigDecimal> fares) {
        StringBuilder sb = new StringBuilder();
        fares.forEach((k, v) -> sb.append(sb.isEmpty() ? "" : ";").append(k).append('=').append(v.toPlainString()));
        return sb.toString();
    }

    public static Map<String, BigDecimal> decode(String text) {
        Map<String, BigDecimal> out = new LinkedHashMap<>();
        if (text == null || text.isBlank()) {
            return out;
        }
        for (String part : text.split(";")) {
            int eq = part.indexOf('=');
            if (eq > 0) {
                try {
                    out.put(part.substring(0, eq), new BigDecimal(part.substring(eq + 1)));
                } catch (NumberFormatException ignored) {
                    // Valor roto: se ignora (en la proxima vuelta se guarda bien).
                }
            }
        }
        return out;
    }

    /** Lo que cambio de precio (un modo nuevo o que desaparece no es un cambio de tarifa). */
    public static List<FareChange> fareChanges(Map<String, BigDecimal> before, Map<String, BigDecimal> after) {
        List<FareChange> out = new ArrayList<>();
        after.forEach((label, price) -> {
            BigDecimal old = before.get(label);
            if (old != null && old.compareTo(price) != 0) {
                out.add(new FareChange(label, old, price));
            }
        });
        return out;
    }

    /** Un aviso a quien eligio "tarifas". since: desde cuando rigen (la fecha mas nueva de las tarifas). */
    public static List<Planned> fares(List<FareChange> changes, LocalDate since, String key, List<Target> targets,
                                      String siteUrl, LocalDate today) {
        if (changes.isEmpty()) {
            return List.of();
        }
        PushMessage message = new PushMessage(faresTitle(changes, since, today), faresBody(changes),
                siteUrl + "/notif/tarifas.png", siteUrl + "/sube", "tarifas", "Ver las tarifas", false);
        return targets.stream().filter(t -> t.kinds().contains("tarifas"))
                .map(t -> new Planned(t.id(), key, message)).toList();
    }

    static String faresTitle(List<FareChange> changes, LocalDate since, LocalDate today) {
        boolean up = changes.stream().allMatch(c -> c.after().compareTo(c.before()) > 0);
        boolean down = changes.stream().allMatch(c -> c.after().compareTo(c.before()) < 0);
        String title = up ? "Aumentan las tarifas" : down ? "Bajan las tarifas" : "Cambian las tarifas";
        if (since != null && since.isAfter(today)) {
            title += " el " + since.getDayOfMonth() + " de " + since.getMonth().getDisplayName(java.time.format.TextStyle.FULL, ES);
        }
        return title;
    }

    /** "Subte $1.453,60 ››› $1.600,00 · Tren $450,00 ››› $500,00" (hasta tres, despues "y más"). */
    static String faresBody(List<FareChange> changes) {
        List<String> parts = changes.stream().limit(3)
                .map(c -> c.label() + " " + money(c.before()) + CHEVRONS + money(c.after())).toList();
        return String.join(" · ", parts) + (changes.size() > 3 ? " y más." : ".");
    }

    static String money(BigDecimal value) {
        DecimalFormat f = new DecimalFormat("#,##0.00", DecimalFormatSymbols.getInstance(ES));
        f.setRoundingMode(RoundingMode.HALF_UP);
        return "$" + f.format(value);
    }

    // ---- Servicios especiales ----

    public record SpecialItem(long id, long lineId, SpecialServiceKind kind, String title, String days, String schedule) {
    }

    /** Un aviso por servicio, a quien sigue esa linea (o una estacion de ella) y eligio "especiales". */
    public static List<Planned> specials(List<SpecialItem> items, Map<Long, LineInfo> lines, List<Target> targets, String siteUrl) {
        List<Planned> out = new ArrayList<>();
        for (SpecialItem s : items) {
            LineInfo line = lines.get(s.lineId());
            if (line == null) {
                continue;
            }
            String title = line.display() + (s.kind() == SpecialServiceKind.CAMBIO ? ": cambio en el servicio" : ": servicio especial");
            String when = String.join(", ", java.util.stream.Stream.of(s.days(), s.schedule())
                    .filter(x -> x != null && !x.isBlank()).map(NotificationTexts::clean).toList());
            String body = NotificationTexts.shorten(NotificationTexts.clean(s.title()) + (when.isEmpty() ? "" : " (" + when + ")") + ".");
            PushMessage message = new PushMessage(title, body, siteUrl + "/notif/linea-" + line.slug() + ".png",
                    siteUrl + "/lineas/" + line.slug(), "especial-" + s.id(), "Ver la línea", false);
            for (Target t : targets) {
                if (t.kinds().contains("especiales") && t.lines().contains(s.lineId())) {
                    out.add(new Planned(t.id(), "especial:" + s.id(), message));
                }
            }
        }
        return out;
    }

    // ---- Ultimo tren ----

    /**
     * El ultimo subte o Premetro de las lineas de cada suscripcion, los
     * minutos antes que eligio. linesById: solo hacen falta las de subte y
     * Premetro.
     */
    public static List<Planned> lastTrains(List<Target> targets, Map<Long, LineInfo> linesById, LocalDateTime now, String siteUrl) {
        List<Planned> out = new ArrayList<>();
        for (Target t : targets) {
            if (t.lastTrainMinutes() == null) {
                continue;
            }
            for (Long lineId : t.lines()) {
                LineInfo line = linesById.get(lineId);
                if (line == null || (line.mode() != TransportMode.SUBTE && line.mode() != TransportMode.PREMETRO)) {
                    continue;
                }
                LastTrains.due(line.code(), t.lastTrainMinutes(), now).ifPresent(due -> out.add(new Planned(t.id(),
                        "ultimo:" + due.code() + ":" + due.serviceDay().format(DAY_KEY),
                        new PushMessage(lastTrainTitle(line, t.lastTrainMinutes()), lastTrainBody(due.departures()),
                                siteUrl + "/notif/linea-" + line.slug() + ".png", siteUrl + "/lineas/" + line.slug(),
                                "ultimo-" + line.slug(), "Ver la línea", false))));
            }
        }
        return out;
    }

    /** "Último subte de la Línea B en 30 minutos", "Último Premetro en 15 minutos". */
    static String lastTrainTitle(LineInfo line, int minutes) {
        String in = minutes == 60 ? "en una hora" : "en " + minutes + " minutos";
        return line.mode() == TransportMode.PREMETRO ? "Último Premetro " + in : "Último subte de la " + line.display() + " " + in;
    }

    /** "Sale de Juan Manuel de Rosas a las 23:00 y de Leandro N. Alem a las 23:32 (puede variar 5 minutos)." */
    static String lastTrainBody(List<LastTrains.Departure> departures) {
        List<String> parts = departures.stream().map(d -> "de " + d.from() + " a las " + d.time()).toList();
        String joined = parts.size() == 1 ? parts.get(0)
                : String.join(", ", parts.subList(0, parts.size() - 1)) + " y " + parts.get(parts.size() - 1);
        return NotificationTexts.shorten("Sale " + joined + " (puede variar 5 minutos).");
    }
}
