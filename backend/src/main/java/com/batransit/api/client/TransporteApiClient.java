package com.batransit.api.client;

import com.batransit.api.config.TransporteApiProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;

/**
 * Encapsula la llamada HTTP a la API Transporte de Buenos Aires. Si
 * la llamada falla (la fuente esta caida, hay timeout, etc.),
 * reintenta unas pocas veces antes de rendirse; el llamador decide
 * que hacer si finalmente no se pudo obtener el dato (ver
 * SubteAlertSyncService: nunca se borra o corrompe lo que ya hay).
 */
@Component
public class TransporteApiClient {

    private static final Logger log = LoggerFactory.getLogger(TransporteApiClient.class);
    private static final int MAX_ATTEMPTS = 3;
    private static final Duration RETRY_DELAY = Duration.ofSeconds(2);

    private final RestClient restClient;
    private final TransporteApiProperties properties;

    public TransporteApiClient(TransporteApiProperties properties) {
        this.properties = properties;
        this.restClient = RestClient.create();
    }

    public SubteAlertsFeed fetchSubteAlerts() {
        RuntimeException lastError = null;

        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                return restClient.get()
                        .uri(properties.getBaseUrl() + "/subtes/serviceAlerts"
                                        + "?client_id={clientId}&client_secret={clientSecret}&json=1",
                                properties.getClientId(), properties.getClientSecret())
                        .retrieve()
                        .body(SubteAlertsFeed.class);
            } catch (RestClientException e) {
                lastError = e;
                log.warn("Intento {}/{} fallido llamando a la API Transporte: {}",
                        attempt, MAX_ATTEMPTS, e.getMessage());
                if (attempt < MAX_ATTEMPTS) {
                    sleepBeforeRetry();
                }
            }
        }

        throw new TransporteApiException(
                "No se pudo obtener las alertas de subte tras " + MAX_ATTEMPTS + " intentos", lastError);
    }

    private void sleepBeforeRetry() {
        try {
            Thread.sleep(RETRY_DELAY.toMillis());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
