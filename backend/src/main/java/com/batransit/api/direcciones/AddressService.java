package com.batransit.api.direcciones;

import com.batransit.api.clima.ForecastService;
import com.batransit.api.estado.SourceHealth;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Busca direcciones con Georef, la API de direcciones de la Nacion
 * (apis.datos.gob.ar, datos abiertos). Para "Mis lugares": la persona escribe
 * su direccion, ve como se encontro y la confirma. Solo se devuelven
 * resultados del AMBA, sin repetidos. Las busquedas se guardan un dia (la
 * misma direccion no se vuelve a consultar) y no se loguean.
 */
@Service
public class AddressService {

    private static final Logger log = LoggerFactory.getLogger(AddressService.class);

    static final int MAX_RESULTS = 5;
    static final int MIN_QUERY = 4;
    static final int MAX_QUERY = 120;
    static final Duration KEEP = Duration.ofDays(1);
    static final int MAX_CACHED = 2_000;

    /** Un resultado: el texto para mostrar, el partido o barrio y el punto (solo para calcular, no se guarda). */
    public record Address(String text, String area, double lat, double lon) {
    }

    private record Cached(List<Address> results, Instant at) {
    }

    private SourceHealth health = SourceHealth.NOOP;

    @Autowired(required = false)
    void setHealth(SourceHealth health) {
        this.health = health;
    }

    private final String baseUrl;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;
    private final Map<String, Cached> cache = new ConcurrentHashMap<>();

    public AddressService(@Value("${app.georef.url:https://apis.datos.gob.ar/georef/api/direcciones}") String baseUrl,
                          ObjectMapper objectMapper) {
        this.baseUrl = baseUrl;
        this.objectMapper = objectMapper;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5_000);
        requestFactory.setReadTimeout(10_000);
        this.restClient = RestClient.builder().requestFactory(requestFactory)
                .defaultHeader("User-Agent", "BA-Transit/1.0 (https://ba-transit.onrender.com)").build();
    }

    /** La busqueda limpia (sin espacios de mas ni caracteres de control), o null si es muy corta o muy larga. */
    static String cleanQuery(String raw) {
        if (raw == null) {
            return null;
        }
        String q = raw.replaceAll("\\p{Cntrl}", " ").replaceAll("\\s+", " ").trim();
        return q.length() < MIN_QUERY || q.length() > MAX_QUERY ? null : q;
    }

    /** Hasta MAX_RESULTS direcciones del AMBA; vacio si no se encontro o Georef no responde. */
    public Optional<List<Address>> search(String raw) {
        String q = cleanQuery(raw);
        if (q == null) {
            return Optional.of(List.of());
        }
        String key = q.toLowerCase(Locale.ROOT);
        Cached cached = cache.get(key);
        if (cached != null && cached.at().plus(KEEP).isAfter(Instant.now())) {
            return Optional.of(cached.results());
        }
        try {
            String url = baseUrl + "?max=10&direccion=" + URLEncoder.encode(q, StandardCharsets.UTF_8);
            List<Address> results = parse(objectMapper.readTree(fetch(url)));
            health.ok(SourceHealth.Source.GEOREF);
            if (cache.size() >= MAX_CACHED) {
                cache.clear();
            }
            cache.put(key, new Cached(results, Instant.now()));
            return Optional.of(results);
        } catch (RestClientResponseException e) {
            fail("HTTP " + e.getStatusCode().value());
        } catch (RestClientException e) {
            fail(e.getMostSpecificCause().getClass().getSimpleName());
        } catch (Exception e) {
            fail(e.getClass().getSimpleName());
        }
        return Optional.empty();
    }

    /** La consulta a Georef (los tests la reemplazan por respuestas grabadas). */
    protected String fetch(String url) {
        return restClient.get().uri(URI.create(url)).retrieve().body(String.class);
    }

    private void fail(String reason) {
        health.fail(SourceHealth.Source.GEOREF, reason);
        log.warn("Georef no respondio bien ({})", reason);
    }

    /** Los resultados del AMBA, sin repetidos (Georef devuelve un resultado por tramo de calle). */
    static List<Address> parse(JsonNode root) {
        List<Address> out = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (JsonNode d : root.path("direcciones")) {
            JsonNode point = d.path("ubicacion");
            if (!point.path("lat").isNumber() || !point.path("lon").isNumber()) {
                continue;
            }
            double lat = point.path("lat").asDouble();
            double lon = point.path("lon").asDouble();
            if (!ForecastService.inArea(lat, lon)) {
                continue;
            }
            String street = street(d.path("calle").path("nombre").asText(""));
            String number = d.path("altura").path("valor").isMissingNode() || d.path("altura").path("valor").isNull()
                    ? "" : " " + d.path("altura").path("valor").asText();
            String area = area(d);
            String text = (street + number).trim();
            if (text.isEmpty() || !seen.add(text + "|" + area)) {
                continue;
            }
            out.add(new Address(text, area, round(lat), round(lon)));
            if (out.size() >= MAX_RESULTS) {
                break;
            }
        }
        return List.copyOf(out);
    }

    /** "4166 PRES JUAN D PERON" -> "Pres Juan D Peron" (sin el codigo de calle del principio). */
    static String street(String raw) {
        String s = raw.trim().replaceFirst("^\\d{4,}\\s+(?=\\D)", "");
        StringBuilder out = new StringBuilder();
        for (String word : s.toLowerCase(Locale.ROOT).split("\\s+")) {
            if (word.isEmpty()) {
                continue;
            }
            if (!out.isEmpty()) {
                out.append(' ');
            }
            out.append(Character.toUpperCase(word.charAt(0))).append(word.substring(1));
        }
        return out.toString();
    }

    /** El partido, o "Ciudad de Buenos Aires" (Georef da la comuna). */
    static String area(JsonNode d) {
        if ("02".equals(d.path("provincia").path("id").asText())) {
            return "Ciudad de Buenos Aires";
        }
        String partido = d.path("departamento").path("nombre").asText("");
        return partido.isBlank() ? d.path("provincia").path("nombre").asText("") : partido;
    }

    /** 4 decimales (unos 10 m): para calcular la estacion cercana, no hace falta mas. */
    private static double round(double v) {
        return Math.round(v * 10_000) / 10_000.0;
    }
}
