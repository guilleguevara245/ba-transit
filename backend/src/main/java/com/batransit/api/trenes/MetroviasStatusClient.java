package com.batransit.api.trenes;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.CookieManager;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Optional;

/**
 * Lee el estado de las lineas que publica Metrovias (info.metrovias.com.ar)
 * de la misma forma que su pagina EstadoLineas/Desktop.html: se conecta a
 * su hub de SignalR 2 ("moveShape") y espera el mensaje "estadoLineas",
 * que trae un pedazo de HTML con el estado.
 *
 * Se usa el transporte longPolling (pedidos HTTP comunes): negotiate ->
 * connect -> start -> poll hasta recibir el mensaje, y despues abort para
 * cerrar la conexion. Si en ese tiempo no llega nada, devuelve vacio.
 */
@Component
public class MetroviasStatusClient {

    private static final Logger log = LoggerFactory.getLogger(MetroviasStatusClient.class);
    static final String HUB = "moveshape";
    static final String METHOD = "estadoLineas";
    static final String PROTOCOL = "2.0";
    static final int MAX_POLLS = 3;

    private final String baseUrl;
    private final ObjectMapper mapper = new ObjectMapper();

    public MetroviasStatusClient(
            @Value("${app.trenes.metrovias-signalr-url:https://info.metrovias.com.ar/EstadoLineas/signalr}") String baseUrl) {
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
    }

    /** HTML del ultimo "estadoLineas" (puede ser "" si Metrovias no tiene informacion), o vacio si fallo. */
    public Optional<String> fetchStatusHtml() {
        // Un cliente por consulta: guarda la cookie de afinidad de esa conexion.
        HttpClient http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .cookieHandler(new CookieManager())
                .build();
        String connectionData = enc("[{\"name\":\"" + HUB + "\"}]");
        String token = null;
        try {
            JsonNode negotiate = get(http, baseUrl + "/negotiate?clientProtocol=" + PROTOCOL
                    + "&connectionData=" + connectionData, Duration.ofSeconds(10));
            token = negotiate.path("ConnectionToken").asText(null);
            if (token == null) {
                log.warn("Metrovias: negotiate sin ConnectionToken.");
                return Optional.empty();
            }
            String common = "transport=longPolling&clientProtocol=" + PROTOCOL
                    + "&connectionToken=" + enc(token) + "&connectionData=" + connectionData;

            JsonNode response = post(http, baseUrl + "/connect?" + common, "", Duration.ofSeconds(30));
            Optional<String> html = estadoLineas(response);
            get(http, baseUrl + "/start?" + common, Duration.ofSeconds(10));

            for (int i = 0; html.isEmpty() && i < MAX_POLLS; i++) {
                String messageId = response.path("C").asText("");
                String groups = response.path("G").asText("");
                String form = "messageId=" + enc(messageId) + (groups.isEmpty() ? "" : "&groupsToken=" + enc(groups));
                // El servidor retiene el poll hasta que hay un mensaje; si no hay
                // novedades, su proxy corta con 504 y se vuelve a intentar.
                try {
                    response = post(http, baseUrl + "/poll?" + common, form, Duration.ofSeconds(125));
                } catch (GatewayTimeout e) {
                    continue;
                }
                html = estadoLineas(response);
            }
            if (html.isEmpty()) {
                log.warn("Metrovias: no llego ningun mensaje {} en {} intentos.", METHOD, MAX_POLLS + 1);
            }
            return html;
        } catch (IOException | RuntimeException e) {
            log.warn("Metrovias no respondio ({}).", e.getClass().getSimpleName());
            return Optional.empty();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        } finally {
            if (token != null) {
                abort(http, token, connectionData);
            }
        }
    }

    /** Busca en una respuesta de SignalR el primer mensaje estadoLineas y devuelve su HTML. */
    static Optional<String> estadoLineas(JsonNode response) {
        for (JsonNode message : response.path("M")) {
            if (HUB.equalsIgnoreCase(message.path("H").asText(""))
                    && METHOD.equalsIgnoreCase(message.path("M").asText(""))) {
                JsonNode args = message.path("A");
                return Optional.of(args.size() > 0 ? args.get(0).asText("") : "");
            }
        }
        return Optional.empty();
    }

    /** El proxy de Metrovias corta los poll sin novedades con 504. */
    static final class GatewayTimeout extends IOException {
        GatewayTimeout() {
            super("HTTP 504");
        }
    }

    private JsonNode get(HttpClient http, String url, Duration timeout) throws IOException, InterruptedException {
        return send(http, HttpRequest.newBuilder(URI.create(url)).timeout(timeout).GET());
    }

    /** connect y poll van por POST, como en el cliente de SignalR de su pagina. */
    private JsonNode post(HttpClient http, String url, String form, Duration timeout)
            throws IOException, InterruptedException {
        return send(http, HttpRequest.newBuilder(URI.create(url)).timeout(timeout)
                .header("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
                .POST(HttpRequest.BodyPublishers.ofString(form)));
    }

    private JsonNode send(HttpClient http, HttpRequest.Builder builder) throws IOException, InterruptedException {
        HttpRequest request = builder.header("User-Agent", "BA-Transit/1.0 (https://ba-transit.onrender.com)").build();
        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() == 504) {
            throw new GatewayTimeout();
        }
        if (response.statusCode() != 200) {
            throw new IOException("HTTP " + response.statusCode());
        }
        String body = response.body();
        return body == null || body.isBlank() ? mapper.createObjectNode() : mapper.readTree(body);
    }

    private void abort(HttpClient http, String token, String connectionData) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl + "/abort?transport=longPolling&clientProtocol="
                            + PROTOCOL + "&connectionToken=" + enc(token) + "&connectionData=" + connectionData))
                    .timeout(Duration.ofSeconds(5))
                    .POST(HttpRequest.BodyPublishers.noBody()).build();
            http.send(request, HttpResponse.BodyHandlers.discarding());
        } catch (IOException | RuntimeException e) {
            // Si no se pudo cerrar, el servidor la da de baja solo al rato.
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private static String enc(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
