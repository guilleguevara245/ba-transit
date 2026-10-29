package com.batransit.api.vuelos;

import com.batransit.api.estado.SourceHealth;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.util.Optional;

/**
 * Cliente de la API abierta de adsb.lol: los aviones que reciben sus
 * antenas voluntarias (ADS-B) en un radio alrededor de un punto. No pide
 * cuenta ni clave. Datos bajo licencia ODbL: hay que nombrar a adsb.lol.
 */
@Component
public class AdsbLolClient {

    private static final Logger log = LoggerFactory.getLogger(AdsbLolClient.class);

    /** Centro entre Aeroparque y Ezeiza; 50 millas nauticas (93 km) cubren el AMBA. */
    static final double CENTER_LAT = -34.65;
    static final double CENTER_LON = -58.55;
    static final int RADIUS_NM = 50;
    static final String URL = "https://api.adsb.lol/v2/point/{lat}/{lon}/{radius}";

    private final RestClient restClient;
    private SourceHealth health = SourceHealth.NOOP;

    /** Registro del estado de la fuente (pagina "Estado de los datos"); opcional para los tests. */
    @Autowired(required = false)
    void setHealth(SourceHealth health) {
        this.health = health;
    }

    public AdsbLolClient() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(10_000);
        requestFactory.setReadTimeout(30_000);
        this.restClient = RestClient.builder().requestFactory(requestFactory)
                .defaultHeader("User-Agent", "BA-Transit/1.0 (https://ba-transit.onrender.com)").build();
    }

    /** Respuesta cruda ({"ac": [...], "now": ...}), o vacio si fallo. */
    public Optional<JsonNode> aircraft() {
        try {
            JsonNode body = restClient.get().uri(URL, CENTER_LAT, CENTER_LON, RADIUS_NM).retrieve().body(JsonNode.class);
            health.ok(SourceHealth.Source.ADSB_LOL);
            return Optional.ofNullable(body);
        } catch (RestClientException e) {
            String reason = e instanceof RestClientResponseException r
                    ? "HTTP " + r.getStatusCode().value()
                    : e.getMostSpecificCause().getClass().getSimpleName();
            log.warn("adsb.lol no respondio ({})", reason);
            health.fail(SourceHealth.Source.ADSB_LOL, reason);
            return Optional.empty();
        }
    }
}
