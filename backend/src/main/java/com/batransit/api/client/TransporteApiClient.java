package com.batransit.api.client;

import com.batransit.api.config.TransporteApiProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;

/**
 * Encapsula la llamada HTTP a la API Transporte de Buenos Aires. Si
 * la llamada falla (la fuente esta caida, hay timeout, etc.),
 * reintenta unas pocas veces antes de rendirse; el llamador decide
 * que hacer si finalmente no se pudo obtener el dato (ver
 * SubteAlertSyncService: nunca se borra o corrompe lo que ya hay).
 *
 * Dos cuidados importantes:
 * - Timeouts explicitos: sin ellos, si la API queda colgada, el unico
 *   hilo del scheduler de Spring se bloquea para siempre y el job no
 *   vuelve a correr.
 * - La API exige las credenciales como query params, asi que la URL
 *   completa contiene el client_secret. Los mensajes de error de
 *   RestClient incluyen esa URL, por eso nunca se loguea
 *   e.getMessage() ni se encadena la excepcion original.
 */
@Component
public class TransporteApiClient {

    private static final Logger log = LoggerFactory.getLogger(TransporteApiClient.class);
    private static final int MAX_ATTEMPTS = 3;
    private static final Duration RETRY_DELAY = Duration.ofSeconds(2);
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(15);

    private final RestClient restClient;
    private final TransporteApiProperties properties;

    public TransporteApiClient(TransporteApiProperties properties) {
        this.properties = properties;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout((int) CONNECT_TIMEOUT.toMillis());
        requestFactory.setReadTimeout((int) READ_TIMEOUT.toMillis());

        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                .build();
    }

    public SubteAlertsFeed fetchSubteAlerts() {
        String lastError = null;

        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                return restClient.get()
                        .uri(properties.getBaseUrl() + "/subtes/serviceAlerts"
                                        + "?client_id={clientId}&client_secret={clientSecret}&json=1",
                                properties.getClientId(), properties.getClientSecret())
                        .retrieve()
                        .body(SubteAlertsFeed.class);
            } catch (RestClientException e) {
                lastError = describeSafely(e);
                log.warn("Intento {}/{} fallido llamando a la API Transporte: {}",
                        attempt, MAX_ATTEMPTS, lastError);

                if (isClientError(e)) {
                    // 4xx (por ejemplo credenciales invalidas): reintentar
                    // no va a cambiar el resultado.
                    break;
                }
                if (attempt < MAX_ATTEMPTS) {
                    sleepBeforeRetry();
                }
            }
        }

        throw new TransporteApiException(
                "No se pudo obtener las alertas de subte de la API Transporte (" + lastError + ")");
    }

    /**
     * Describe el error sin incluir la URL (que lleva el client_secret).
     */
    static String describeSafely(RestClientException e) {
        if (e instanceof RestClientResponseException responseError) {
            return "HTTP " + responseError.getStatusCode().value();
        }
        Throwable root = e.getMostSpecificCause();
        return root.getClass().getSimpleName();
    }

    private static boolean isClientError(RestClientException e) {
        return e instanceof RestClientResponseException responseError
                && responseError.getStatusCode().is4xxClientError();
    }

    private void sleepBeforeRetry() {
        try {
            Thread.sleep(RETRY_DELAY.toMillis());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
