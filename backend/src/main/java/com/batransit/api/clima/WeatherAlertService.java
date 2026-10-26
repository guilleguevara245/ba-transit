package com.batransit.api.clima;

import com.batransit.api.clima.CapParser.CapAlert;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.net.URI;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Alertas meteorologicas del SMN que afectan a la Ciudad y el AMBA.
 *
 * Cada 10 minutos lee el indice del feed CAP y descarga solo los
 * documentos nuevos (cada alerta es un archivo que no cambia; las
 * actualizaciones y cancelaciones llegan como documentos nuevos que
 * referencian al anterior). Si el feed falla se conserva lo ultimo que
 * se leyo.
 */
@Service
public class WeatherAlertService {

    private static final Logger log = LoggerFactory.getLogger(WeatherAlertService.class);

    /** Como mucho estos documentos nuevos por corrida (el SMN responde 429 si se piden muchos juntos). */
    static final int MAX_NEW_DOCUMENTS = 40;
    /**
     * Tipos que se muestran en el sitio. El viento solo no se muestra: rara
     * vez afecta al transporte, y cuando viene con tormentas ya esta la
     * alerta por tormentas.
     */
    static final Set<String> KINDS = Set.of("TORMENTAS", "LLUVIAS", "CALOR");

    /** Puntos de referencia: Ciudad y cuatro zonas del conurbano. */
    static final double[][] AMBA_POINTS = {
        {-34.6037, -58.3816}, // Ciudad (Obelisco)
        {-34.5000, -58.5500}, // conurbano norte
        {-34.6600, -58.6500}, // conurbano oeste
        {-34.7600, -58.4000}, // conurbano sur
        {-34.7200, -58.2500}, // Quilmes
    };
    private static final List<String> AMBA_NAMES = List.of("ciudad autonoma", "capital federal", "caba",
            "conurbano", "gran buenos aires", "amba", "area metropolitana");

    /** Alerta lista para mostrar. */
    public record WeatherAlert(String id, String kind, String level, String title, String description,
                               String instruction, OffsetDateTime onset, OffsetDateTime expires,
                               List<String> areas) {
    }

    private final String indexUrl;
    private final RestClient restClient;
    private final Map<String, CapAlert> documents = new ConcurrentHashMap<>();
    private volatile List<WeatherAlert> current = List.of();
    private volatile Instant updatedAt;

    public WeatherAlertService(@Value("${app.smn.cap-url:https://ssl.smn.gob.ar/CAP/AR.php}") String indexUrl) {
        this.indexUrl = indexUrl;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5_000);
        requestFactory.setReadTimeout(15_000);
        this.restClient = RestClient.builder().requestFactory(requestFactory)
                .defaultHeader("User-Agent", "BA-Transit/1.0 (https://ba-transit.onrender.com)").build();
    }

    public List<WeatherAlert> current() {
        return current;
    }

    public Instant updatedAt() {
        return updatedAt;
    }

    @Scheduled(initialDelay = 20_000, fixedDelay = 10 * 60 * 1000L)
    public void refresh() {
        try {
            String index = fetch(indexUrl);
            if (index == null) {
                return;
            }
            List<String> links = CapParser.parseIndex(index);
            int downloaded = 0;
            for (String link : links) {
                if (documents.containsKey(link) || downloaded >= MAX_NEW_DOCUMENTS) {
                    continue;
                }
                String xml = fetch(URI.create(indexUrl).resolve(link).toString());
                downloaded++;
                if (xml != null) {
                    CapParser.parseAlert(xml).ifPresent(alert -> documents.put(link, alert));
                }
            }
            // Se olvidan los documentos que ya no estan en el indice.
            documents.keySet().retainAll(new HashSet<>(links));
            current = select(documents.values(), OffsetDateTime.now());
            updatedAt = Instant.now();
            log.info("Alertas SMN: {} documentos en el indice, {} nuevos, {} alertas para el AMBA",
                    links.size(), downloaded, current.size());
        } catch (Exception e) {
            log.warn("No se pudieron actualizar las alertas del SMN ({})", e.getClass().getSimpleName());
        }
    }

    /**
     * Alertas vigentes para el AMBA, sin las canceladas ni las reemplazadas
     * por una actualizacion, una por tipo (la de mayor nivel).
     */
    static List<WeatherAlert> select(Iterable<CapAlert> alerts, OffsetDateTime now) {
        Set<String> superseded = new HashSet<>();
        List<CapAlert> all = new ArrayList<>();
        for (CapAlert alert : alerts) {
            all.add(alert);
            superseded.addAll(alert.references());
        }
        Map<String, WeatherAlert> byKind = new LinkedHashMap<>();
        all.stream()
                .filter(a -> !"Cancel".equalsIgnoreCase(a.msgType()))
                .filter(a -> !superseded.contains(a.identifier()))
                .filter(a -> a.level() != null && KINDS.contains(a.kind()))
                .filter(a -> a.expires() == null || a.expires().isAfter(now))
                .filter(WeatherAlertService::affectsAmba)
                .sorted(Comparator.comparingInt((CapAlert a) -> rank(a.level())).reversed())
                .forEach(a -> byKind.putIfAbsent(a.kind(), new WeatherAlert(a.identifier(), a.kind(), a.level(),
                        a.headline().isBlank() ? a.event() : a.headline(), a.description(), a.instruction(),
                        a.onset(), a.expires(), ambaAreas(a))));
        return List.copyOf(byKind.values());
    }

    static boolean affectsAmba(CapAlert alert) {
        for (List<double[]> polygon : alert.polygons()) {
            for (double[] point : AMBA_POINTS) {
                if (CapParser.contains(polygon, point[0], point[1])) {
                    return true;
                }
            }
        }
        return alert.areas().stream().map(CapParser::normalize).anyMatch(a -> AMBA_NAMES.stream().anyMatch(a::contains));
    }

    /** Zonas del AMBA nombradas en la alerta (para el texto), o todas si no se reconoce ninguna. */
    private static List<String> ambaAreas(CapAlert alert) {
        List<String> amba = alert.areas().stream()
                .filter(a -> AMBA_NAMES.stream().anyMatch(CapParser.normalize(a)::contains))
                .toList();
        return amba.isEmpty() ? alert.areas().stream().limit(6).toList() : amba;
    }

    private static int rank(String level) {
        return switch (level) {
            case "ROJA" -> 3;
            case "NARANJA" -> 2;
            default -> 1;
        };
    }

    private String fetch(String url) {
        try {
            return restClient.get().uri(URI.create(url)).retrieve().body(String.class);
        } catch (RestClientException e) {
            String reason = e instanceof RestClientResponseException r
                    ? "HTTP " + r.getStatusCode().value()
                    : e.getMostSpecificCause().getClass().getSimpleName();
            log.warn("SMN no respondio ({}) para {}", reason, url);
            return null;
        } catch (IllegalArgumentException e) {
            log.warn("Enlace invalido en el feed del SMN: {}", url);
            return null;
        }
    }
}
