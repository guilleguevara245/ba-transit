package com.batransit.api.accesos;

import com.batransit.api.estado.SourceHealth;
import com.batransit.api.accesos.AccessModels.FlowData;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Cliente de la API Traffic Flow (Flow Segment Data) de TomTom: para un
 * punto devuelve la velocidad actual y sin transito del tramo de ruta
 * mas cercano. La clave va en la URL, asi que nunca se loguea la URL ni
 * el mensaje de error completo.
 */
@Component
public class TomTomTrafficClient {

    private static final Logger log = LoggerFactory.getLogger(TomTomTrafficClient.class);

    private SourceHealth health = SourceHealth.NOOP;

    /** Registro del estado de la fuente (pagina "Estado de los datos"); opcional para los tests. */
    @Autowired(required = false)
    void setHealth(SourceHealth health) {
        this.health = health;
    }
    private static final String URL = "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json"
            + "?point={point}&unit=KMPH&key={key}";

    private final String apiKey;
    private final RestClient restClient;

    public TomTomTrafficClient(@Value("${app.tomtom.api-key:}") String apiKey) {
        this.apiKey = apiKey;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5_000);
        requestFactory.setReadTimeout(10_000);
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    public Optional<FlowData> flowAt(double lat, double lon) {
        String point = String.format(Locale.ROOT, "%.6f,%.6f", lat, lon);
        try {
            JsonNode body = restClient.get().uri(URL, point, apiKey).retrieve().body(JsonNode.class);
            health.ok(SourceHealth.Source.TOMTOM);
            return Optional.ofNullable(parse(body));
        } catch (RestClientException e) {
            String reason = e instanceof RestClientResponseException r
                    ? "HTTP " + r.getStatusCode().value()
                    : e.getMostSpecificCause().getClass().getSimpleName();
            log.warn("TomTom no respondio para el punto {} ({})", point, reason);
            health.fail(SourceHealth.Source.TOMTOM, reason);
            return Optional.empty();
        }
    }

    /** Convierte la respuesta JSON de TomTom; null si no trae datos. */
    static FlowData parse(JsonNode body) {
        JsonNode data = body == null ? null : body.get("flowSegmentData");
        if (data == null || !data.hasNonNull("currentSpeed") || !data.hasNonNull("freeFlowSpeed")) {
            return null;
        }
        List<double[]> geometry = new ArrayList<>();
        JsonNode coordinates = data.path("coordinates").path("coordinate");
        for (JsonNode c : coordinates) {
            geometry.add(new double[] {c.path("latitude").asDouble(), c.path("longitude").asDouble()});
        }
        return new FlowData(
                data.get("currentSpeed").asDouble(),
                data.get("freeFlowSpeed").asDouble(),
                data.path("roadClosure").asBoolean(false),
                data.path("frc").asText(""),
                data.path("confidence").asDouble(0),
                geometry);
    }
}
