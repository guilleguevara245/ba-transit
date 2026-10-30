package com.batransit.api.notificaciones;

import com.batransit.api.cuentas.AccountException;
import com.batransit.api.cuentas.AccountModels.Favorites;
import com.batransit.api.cuentas.AccountService;
import com.batransit.api.notificaciones.NotificationModels.SubscribeRequest;
import com.batransit.api.notificaciones.NotificationPlanner.Planned;
import com.batransit.api.notificaciones.NotificationPlanner.Subscriber;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Suscripciones a los avisos (activar, actualizar, borrar, probar) y la
 * entrega: respeta el horario sin avisos de cada una, no repite un aviso y
 * borra las suscripciones que el navegador dio de baja.
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    static final ZoneId BUENOS_AIRES = ZoneId.of("America/Argentina/Buenos_Aires");
    static final Set<String> KINDS = Set.of("lineas", "estaciones", "accesos");

    private final PushSubscriptionRepository subscriptions;
    private final PushStore store;
    private final WebPushSender sender;
    private final ObjectMapper mapper;
    private final String siteUrl;

    public NotificationService(PushSubscriptionRepository subscriptions, PushStore store, WebPushSender sender,
                               ObjectMapper mapper, @Value("${app.site-url:https://ba-transit.onrender.com}") String siteUrl) {
        this.subscriptions = subscriptions;
        this.store = store;
        this.sender = sender;
        this.mapper = mapper;
        this.siteUrl = siteUrl.replaceAll("/+$", "");
    }

    public String siteUrl() {
        return siteUrl;
    }

    @Transactional
    public void subscribe(SubscribeRequest r, Long userId) {
        if (r == null || r.endpoint() == null || r.keys() == null || r.keys().p256dh() == null || r.keys().auth() == null) {
            throw bad("Faltan los datos de la suscripción.");
        }
        if (r.endpoint().length() > 1000 || !WebPushSender.isPushEndpoint(r.endpoint())) {
            throw bad("Ese navegador no tiene un servicio de avisos compatible.");
        }
        if (r.keys().p256dh().length() > 200 || r.keys().auth().length() > 100) {
            throw bad("La suscripción no es válida.");
        }
        Short from = hour(r.quietFrom());
        Short to = hour(r.quietTo());
        if ((from == null) != (to == null)) {
            throw bad("Elegí el horario completo sin avisos (desde y hasta).");
        }
        Set<String> kinds = new LinkedHashSet<>(r.kinds() == null ? KINDS : r.kinds());
        kinds.retainAll(KINDS);
        String favorites;
        try {
            favorites = mapper.writeValueAsString(AccountService.sanitize(r.favorites()));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
        PushSubscription sub = subscriptions.findByEndpoint(r.endpoint())
                .orElseGet(() -> new PushSubscription(r.endpoint(), r.keys().p256dh(), r.keys().auth()));
        sub.update(r.keys().p256dh(), r.keys().auth(), userId, favorites, String.join(",", kinds),
                r.notifyResolved() == null || r.notifyResolved(), from, to, Instant.now());
        sub.updateExtras(summaryTime(r.summaryTime()), summaryDays(r.summaryDays()), greeting(r.greetingName()),
                lastTrainMinutes(r.lastTrainMinutes()));
        subscriptions.save(sub);
    }

    @Transactional
    public void unsubscribe(String endpoint) {
        if (endpoint != null) {
            subscriptions.findByEndpoint(endpoint).ifPresent(subscriptions::delete);
        }
    }

    /** Un aviso de prueba, para que la persona vea como llegan. */
    @Transactional
    public void sendTest(String endpoint) {
        PushSubscription sub = endpoint == null ? null : subscriptions.findByEndpoint(endpoint).orElse(null);
        if (sub == null) {
            throw bad("Primero activá los avisos en este navegador.");
        }
        PushMessage test = new PushMessage("Los avisos de BA Transit funcionan",
                "Así te vamos a avisar cuando haya problemas en tus líneas, estaciones o accesos.",
                siteUrl + "/icon-192.png", siteUrl + "/", "prueba", "Abrir BA Transit", false);
        WebPushSender.Result result = sender.send(sub, test);
        if (result == WebPushSender.Result.GONE) {
            subscriptions.delete(sub);
            throw bad("Este navegador dio de baja los avisos: activalos de nuevo.");
        }
        if (result == WebPushSender.Result.FAILED) {
            throw new AccountException(HttpStatus.BAD_GATEWAY, "No se pudo mandar el aviso de prueba. Probá en un rato.");
        }
    }

    /** Todas las suscripciones, como preferencias para el planificador. */
    @Transactional(readOnly = true)
    public List<Subscriber> subscribers() {
        return subscriptions.findAll().stream().map(this::toSubscriber).toList();
    }

    Subscriber toSubscriber(PushSubscription s) {
        Favorites f;
        try {
            f = AccountService.sanitize(mapper.readValue(s.getFavorites(), Favorites.class));
        } catch (JsonProcessingException e) {
            f = Favorites.empty();
        }
        Set<String> kinds = new HashSet<>(List.of(s.getKinds().split(",")));
        return new Subscriber(s.getId(), new HashSet<>(f.lineas()), new HashSet<>(f.estaciones()), new HashSet<>(f.accesos()),
                kinds.contains("lineas"), kinds.contains("estaciones"), kinds.contains("accesos"), s.isNotifyResolved());
    }

    public int cleanup(Instant before) {
        return store.cleanup(before);
    }

    public boolean wasSent(long subscriptionId, String key) {
        return store.wasSent(subscriptionId, key);
    }

    /**
     * Entrega los avisos planeados. extraKey: otra clave a marcar junto con
     * la del aviso (por ejemplo, "un aviso de este acceso en esta hora").
     */
    @Transactional
    public int deliver(List<Planned> planned, Function<Planned, String> extraKey) {
        if (planned.isEmpty()) {
            return 0;
        }
        Map<Long, PushSubscription> byId = subscriptions.findAllById(
                planned.stream().map(Planned::subscriptionId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(PushSubscription::getId, s -> s));
        int sent = 0;
        Instant now = Instant.now();
        for (Planned p : planned) {
            PushSubscription sub = byId.get(p.subscriptionId());
            boolean summary = p.eventKey().startsWith("resumen:");
            if (sub == null || isPaused(sub, now) || (!summary && inQuietHours(sub, now))) {
                continue; // el resumen se pidio a esa hora a proposito: no lo frena el horario sin avisos
            }
            if (!store.claim(sub.getId(), p.eventKey())) {
                continue; // ya se mando
            }
            String extra = extraKey == null ? null : extraKey.apply(p);
            if (extra != null) {
                store.claim(sub.getId(), extra);
            }
            WebPushSender.Result result = sender.send(sub, p.message());
            if (result == WebPushSender.Result.SENT) {
                sub.markSent(now);
                sent++;
            } else if (result == WebPushSender.Result.GONE) {
                subscriptions.delete(sub);
                byId.remove(sub.getId());
            }
        }
        if (sent > 0) {
            log.info("Avisos: {} enviado(s)", sent);
        }
        return sent;
    }

    static boolean isPaused(PushSubscription s, Instant now) {
        return s.getPausedUntil() != null && s.getPausedUntil().isAfter(now);
    }

    /** Las suscripciones con resumen diario (para el trabajo que los manda). */
    @Transactional(readOnly = true)
    public List<PushSubscription> withSummary() {
        return subscriptions.findAll().stream().filter(s -> s.getSummaryTime() != null).toList();
    }

    /** Si ahora es horario sin avisos para esa suscripcion (puede cruzar la medianoche: 23 a 7). */
    static boolean inQuietHours(PushSubscription s, Instant now) {
        if (s.getQuietFrom() == null || s.getQuietTo() == null) {
            return false;
        }
        int hour = ZonedDateTime.ofInstant(now, BUENOS_AIRES).getHour();
        int from = s.getQuietFrom();
        int to = s.getQuietTo();
        if (from == to) {
            return false;
        }
        return from < to ? hour >= from && hour < to : hour >= from || hour < to;
    }

    private static final java.util.regex.Pattern TIME = java.util.regex.Pattern.compile("^([01]\\d|2[0-3]):[0-5]\\d$");
    static final Set<Integer> LAST_TRAIN_OPTIONS = Set.of(15, 30, 45, 60);

    static String summaryTime(String time) {
        if (time == null || time.isBlank()) {
            return null;
        }
        if (!TIME.matcher(time).matches()) {
            throw bad("La hora del resumen no es válida.");
        }
        return time;
    }

    /** [1, 3, 5] -> "135" (sin repetidos, en orden); vacio = todos los dias habiles. */
    static String summaryDays(List<Integer> days) {
        if (days == null || days.isEmpty()) {
            return "12345";
        }
        String out = days.stream().filter(d -> d != null && d >= 1 && d <= 7).distinct().sorted()
                .map(String::valueOf).collect(Collectors.joining());
        return out.isEmpty() ? "12345" : out;
    }

    static String greeting(String name) {
        String clean = AccountService.cleanName(name);
        return clean == null ? null : clean.length() > 40 ? clean.substring(0, 40) : clean;
    }

    static Short lastTrainMinutes(Integer minutes) {
        if (minutes == null) {
            return null;
        }
        if (!LAST_TRAIN_OPTIONS.contains(minutes)) {
            throw bad("Elegí 15, 30, 45 o 60 minutos antes del último tren.");
        }
        return minutes.shortValue();
    }

    private static Short hour(Integer h) {
        if (h == null) {
            return null;
        }
        if (h < 0 || h > 23) {
            throw bad("La hora tiene que estar entre 0 y 23.");
        }
        return h.shortValue();
    }

    private static AccountException bad(String message) {
        return new AccountException(HttpStatus.BAD_REQUEST, message);
    }
}
