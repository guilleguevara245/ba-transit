package com.batransit.api.accesos;

import com.batransit.api.estado.SourceHealth;
import com.batransit.api.accesos.AccessModels.FlowData;
import com.batransit.api.accesos.AccessModels.Incident;
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
    /**
     * Nivel de zoom de la consulta (0-22). Con 10 TomTom devolvia tramos
     * generalizados muy largos: los dos puntos del Acceso Oeste (General
     * Paz y Moreno, a 10 km) caian en el mismo tramo y daban el mismo dato.
     * Con un zoom mas alto los tramos son mas cortos y la geometria cae
     * mejor sobre la autopista.
     */
    static final int ZOOM = 16;

    private static final String URL = "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/" + ZOOM + "/json"
            + "?point={point}&unit=KMPH&key={key}";

    /**
     * Traffic Incidents (Incident Details): los embotellamientos (6) de un
     * rectangulo, con su recorrido, largo y demora. fields pide solo lo que
     * se usa; la API lo recibe con las llaves codificadas.
     */
    private static final String INCIDENTS_URL = "https://api.tomtom.com/traffic/services/5/incidentDetails"
            + "?bbox={bbox}&fields={fields}&language=es-ES&categoryFilter=6&timeValidityFilter=present&key={key}";

    static final String INCIDENT_FIELDS = "{incidents{type,geometry{type,coordinates},"
            + "properties{iconCategory,magnitudeOfDelay,from,to,length,delay,roadNumbers}}}";

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

    /**
     * Los embotellamientos dentro del rectangulo (minLon,minLat,maxLon,maxLat).
     * Vacio si TomTom no respondio: entonces se muestra solo lo medido en los
     * puntos, como antes.
     */
    public Optional<List<Incident>> incidentsIn(double minLat, double minLon, double maxLat, double maxLon) {
        String bbox = String.format(Locale.ROOT, "%.5f,%.5f,%.5f,%.5f", minLon, minLat, maxLon, maxLat);
        try {
            JsonNode body = restClient.get().uri(INCIDENTS_URL, bbox, INCIDENT_FIELDS, apiKey).retrieve()
                    .body(JsonNode.class);
            return Optional.of(parseIncidents(body));
        } catch (RestClientException e) {
            String reason = e instanceof RestClientResponseException r
                    ? "HTTP " + r.getStatusCode().value()
                    : e.getMostSpecificCause().getClass().getSimpleName();
            log.warn("TomTom no respondio los embotellamientos ({})", reason);
            return Optional.empty();
        }
    }

    /** Convierte la respuesta de Incident Details; los puntos quedan como [lat, lon]. */
    static List<Incident> parseIncidents(JsonNode body) {
        List<Incident> result = new ArrayList<>();
        if (body == null) {
            return result;
        }
        for (JsonNode item : body.path("incidents")) {
            JsonNode p = item.path("properties");
            List<double[]> geometry = new ArrayList<>();
            JsonNode coordinates = item.path("geometry").path("coordinates");
            if ("Point".equals(item.path("geometry").path("type").asText())) {
                if (coordinates.size() >= 2) {
                    geometry.add(new double[] {coordinates.get(1).asDouble(), coordinates.get(0).asDouble()});
                }
            } else {
                for (JsonNode c : coordinates) {
                    if (c.size() >= 2) {
                        geometry.add(new double[] {c.get(1).asDouble(), c.get(0).asDouble()});
                    }
                }
            }
            List<String> roads = new ArrayList<>();
            for (JsonNode r : p.path("roadNumbers")) {
                roads.add(r.asText());
            }
            result.add(new Incident(
                    p.path("iconCategory").asInt(0),
                    p.path("magnitudeOfDelay").asInt(0),
                    p.path("from").asText(null),
                    p.path("to").asText(null),
                    (int) Math.round(p.path("length").asDouble(0)),
                    p.path("delay").asInt(0),
                    roads,
                    geometry));
        }
        return result;
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
