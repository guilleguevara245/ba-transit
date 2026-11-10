package com.batransit.api.contacto;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Freno para el formulario de contacto: como mucho MAX_PER_IP mensajes por
 * direccion IP cada IP_WINDOW, y MAX_PER_DAY entre todos cada DAY. El tope
 * diario cuida el cupo gratuito de Brevo (300 mails por dia), que tambien
 * usan los mails para recuperar la contrasena. En memoria, como el freno
 * de los ingresos y el de las direcciones.
 */
@Component
public class ContactRateLimiter {

    static final int MAX_PER_IP = 5;
    static final Duration IP_WINDOW = Duration.ofHours(1);
    static final int MAX_PER_DAY = 100;
    static final Duration DAY = Duration.ofDays(1);
    private static final int MAX_KEYS = 10_000;

    /** Por que se freno un mensaje. */
    public enum Result { OK, TOO_MANY_FROM_IP, TOO_MANY_TODAY }

    private final Clock clock;
    private final Map<String, Deque<Instant>> byIp = new ConcurrentHashMap<>();
    private final Deque<Instant> all = new ArrayDeque<>();

    @Autowired
    public ContactRateLimiter() {
        this(Clock.systemUTC());
    }

    ContactRateLimiter(Clock clock) {
        this.clock = clock;
    }

    /** Registra un mensaje de esa IP si entra en los dos topes. */
    public Result tryAcquire(String ip) {
        Instant now = clock.instant();
        if (byIp.size() > MAX_KEYS) {
            byIp.clear(); // limite de memoria: se vacia antes que crecer sin fin
        }
        Deque<Instant> times = byIp.computeIfAbsent(ip, k -> new ArrayDeque<>());
        synchronized (all) {
            drop(all, now.minus(DAY));
            synchronized (times) {
                drop(times, now.minus(IP_WINDOW));
                if (times.size() >= MAX_PER_IP) {
                    return Result.TOO_MANY_FROM_IP;
                }
                if (all.size() >= MAX_PER_DAY) {
                    return Result.TOO_MANY_TODAY;
                }
                times.addLast(now);
                all.addLast(now);
                return Result.OK;
            }
        }
    }

    private static void drop(Deque<Instant> times, Instant before) {
        while (!times.isEmpty() && times.peekFirst().isBefore(before)) {
            times.pollFirst();
        }
    }
}
