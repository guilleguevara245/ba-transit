package com.batransit.api.colectivos;

import com.batransit.api.colectivos.BusAlertParser.BusAlert;
import com.batransit.api.live.TransporteLiveClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * Alertas de colectivos de la API Transporte. Se piden por linea (el
 * numero, sin cartel) y se guardan 5 minutos.
 */
@RestController
@RequestMapping("/api/v1/colectivos/alertas")
public class BusAlertController {

    static final String PATH = "/colectivos/serviceAlerts?json=1";
    static final Duration MAX_AGE = Duration.ofMinutes(5);

    public record Response(boolean available, List<BusAlert> alerts) {
    }

    private final TransporteLiveClient client;

    public BusAlertController(TransporteLiveClient client) {
        this.client = client;
    }

    @GetMapping
    public Response alerts(@RequestParam(name = "linea", required = false) String line) {
        if (!client.isConfigured()) {
            return new Response(false, List.of());
        }
        var fetched = client.get(PATH, MAX_AGE);
        if (fetched.isEmpty()) {
            return new Response(false, List.of());
        }
        List<BusAlert> all = BusAlertParser.parse(fetched.get().body(), Instant.now());
        String wanted = normalize(line);
        List<BusAlert> result = wanted == null ? all
                : all.stream().filter(a -> a.lines().contains(wanted)).toList();
        return new Response(true, result);
    }

    /** "053", "53A" o "53" -> "53"; null si no hay numero. */
    static String normalize(String line) {
        if (line == null) {
            return null;
        }
        String digits = line.replaceAll("^\\D*(\\d{1,3}).*$", "$1");
        return digits.matches("\\d{1,3}") ? String.valueOf(Integer.parseInt(digits)) : null;
    }
}
