package com.batransit.api.cuentas;

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
 * Freno contra quien prueba contrasenas: como mucho MAX_ATTEMPTS intentos
 * por clave (direccion IP o mail) cada WINDOW. En memoria: se reinicia
 * con el servidor, lo que alcanza para un sitio de este tamano.
 */
@Component
public class LoginRateLimiter {

    static final int MAX_ATTEMPTS = 10;
    static final Duration WINDOW = Duration.ofMinutes(15);
    private static final int MAX_KEYS = 10_000;

    private final Clock clock;
    private final Map<String, Deque<Instant>> attempts = new ConcurrentHashMap<>();

    @Autowired
    public LoginRateLimiter() {
        this(Clock.systemUTC());
    }

    LoginRateLimiter(Clock clock) {
        this.clock = clock;
    }

    /** Registra un intento; false si esa clave ya hizo demasiados. */
    public boolean tryAcquire(String key) {
        Instant now = clock.instant();
        if (attempts.size() > MAX_KEYS) {
            attempts.clear(); // limite de memoria: se vacia antes que crecer sin fin
        }
        Deque<Instant> times = attempts.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (times) {
            while (!times.isEmpty() && times.peekFirst().isBefore(now.minus(WINDOW))) {
                times.pollFirst();
            }
            if (times.size() >= MAX_ATTEMPTS) {
                return false;
            }
            times.addLast(now);
            return true;
        }
    }
}
