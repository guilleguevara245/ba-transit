package com.batransit.api.direcciones;

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
 * Freno para la busqueda de direcciones: como mucho MAX_SEARCHES por
 * direccion IP cada WINDOW. Alcanza para escribir varias direcciones
 * (las sugerencias se piden al dejar de tipear) y evita que alguien use
 * el endpoint para consultar Georef sin parar. En memoria, como el freno
 * de los ingresos.
 */
@Component
public class AddressRateLimiter {

    static final int MAX_SEARCHES = 60;
    static final Duration WINDOW = Duration.ofMinutes(10);
    private static final int MAX_KEYS = 10_000;

    private final Clock clock;
    private final Map<String, Deque<Instant>> searches = new ConcurrentHashMap<>();

    @Autowired
    public AddressRateLimiter() {
        this(Clock.systemUTC());
    }

    AddressRateLimiter(Clock clock) {
        this.clock = clock;
    }

    /** Registra una busqueda; false si esa IP ya hizo demasiadas. */
    public boolean tryAcquire(String ip) {
        Instant now = clock.instant();
        if (searches.size() > MAX_KEYS) {
            searches.clear(); // limite de memoria: se vacia antes que crecer sin fin
        }
        Deque<Instant> times = searches.computeIfAbsent(ip, k -> new ArrayDeque<>());
        synchronized (times) {
            while (!times.isEmpty() && times.peekFirst().isBefore(now.minus(WINDOW))) {
                times.pollFirst();
            }
            if (times.size() >= MAX_SEARCHES) {
                return false;
            }
            times.addLast(now);
            return true;
        }
    }
}
