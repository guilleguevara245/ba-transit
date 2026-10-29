package com.batransit.api.vuelos;

import com.batransit.api.estado.SourceHealth;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.time.Clock;
import java.time.Instant;
import java.util.Optional;

/**
 * Cliente de la API REST de OpenSky Network (posiciones ADS-B que juntan
 * antenas voluntarias). Pide los aviones dentro de un recuadro alrededor
 * de Buenos Aires: menos de 25 grados cuadrados, asi que cada pedido
 * cuesta 1 credito. Sin cuenta hay 400 creditos por dia; con una cuenta
 * (cliente OAuth2 de OpenSky) hay 4000. Las credenciales nunca se loguean.
 */
@Component
public class OpenSkyClient {

    private static final Logger log = LoggerFactory.getLogger(OpenSkyClient.class);

    static final String STATES_URL = "https://opensky-network.org/api/states/all"
            + "?lamin={lamin}&lomin={lomin}&lamax={lamax}&lomax={lomax}";
    static final String TOKEN_URL =
            "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";

    /** Recuadro: de Pilar y Escobar a Cañuelas, y de General Rodriguez al Rio de la Plata. */
    static final double LAT_MIN = -35.3;
    static final double LAT_MAX = -34.0;
    static final double LON_MIN = -59.3;
    static final double LON_MAX = -57.9;

    private final String clientId;
    private final String clientSecret;
    private final RestClient restClient;
    private final Clock clock = Clock.systemUTC();
    private SourceHealth health = SourceHealth.NOOP;

    private String token;
    private Instant tokenExpiresAt = Instant.EPOCH;

    /** Registro del estado de la fuente (pagina "Estado de los datos"); opcional para los tests. */
    @Autowired(required = false)
    void setHealth(SourceHealth health) {
        this.health = health;
    }

    public OpenSkyClient(@Value("${app.opensky.client-id:}") String clientId,
                         @Value("${app.opensky.client-secret:}") String clientSecret) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        // OpenSky puede tardar bastante: el pedido corre en segundo plano, asi que se le da tiempo.
        requestFactory.setConnectTimeout(15_000);
        requestFactory.setReadTimeout(45_000);
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    public boolean isRegistered() {
        return clientId != null && !clientId.isBlank() && clientSecret != null && !clientSecret.isBlank();
    }

    /** Respuesta cruda de /states/all, o vacio si fallo. */
    public Optional<JsonNode> states() {
        try {
            RestClient.RequestHeadersSpec<?> request = restClient.get()
                    .uri(STATES_URL, LAT_MIN, LON_MIN, LAT_MAX, LON_MAX);
            String bearer = isRegistered() ? bearerToken() : null;
            if (bearer != null) {
                request = request.header("Authorization", "Bearer " + bearer);
            }
            JsonNode body = request.retrieve().body(JsonNode.class);
            health.ok(SourceHealth.Source.OPENSKY);
            return Optional.ofNullable(body);
        } catch (RestClientException e) {
            String reason = reason(e);
            if (e instanceof RestClientResponseException r && r.getStatusCode().value() == 401) {
                tokenExpiresAt = Instant.EPOCH; // el token vencio antes de lo previsto: pedir otro
            }
            log.warn("OpenSky no respondio ({})", reason);
            health.fail(SourceHealth.Source.OPENSKY, reason);
            return Optional.empty();
        }
    }

    /**
     * Token OAuth2 (client credentials), guardado hasta un minuto antes de
     * que venza (duran 30 minutos). Si no se puede obtener, se sigue sin
     * cuenta: el pedido funciona igual, con el limite anonimo.
     */
    private synchronized String bearerToken() {
        Instant now = clock.instant();
        if (token != null && now.isBefore(tokenExpiresAt)) {
            return token;
        }
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "client_credentials");
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        try {
            JsonNode body = restClient.post().uri(TOKEN_URL)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(JsonNode.class);
            String value = body == null ? null : body.path("access_token").asText(null);
            if (value == null || value.isBlank()) {
                log.warn("OpenSky: la respuesta del token no trae access_token");
                return null;
            }
            long seconds = body.path("expires_in").asLong(1800);
            token = value;
            tokenExpiresAt = now.plusSeconds(Math.max(60, seconds - 60));
            return token;
        } catch (RestClientException e) {
            log.warn("OpenSky: no se pudo obtener el token ({}); se consulta sin cuenta", reason(e));
            return null;
        }
    }

    private static String reason(RestClientException e) {
        return e instanceof RestClientResponseException r
                ? "HTTP " + r.getStatusCode().value()
                : e.getMostSpecificCause().getClass().getSimpleName();
    }
}
