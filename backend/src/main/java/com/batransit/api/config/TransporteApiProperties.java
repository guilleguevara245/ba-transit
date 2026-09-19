package com.batransit.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Lee la seccion "transporte.api" de application.yml (base-url,
 * client-id, client-secret) y la expone como un objeto tipado, en vez
 * de repetir @Value("${transporte.api...}") suelto en cada clase que
 * lo necesite.
 */
@Component
@ConfigurationProperties(prefix = "transporte.api")
public class TransporteApiProperties {

    private String baseUrl;
    private String clientId;
    private String clientSecret;

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getClientSecret() {
        return clientSecret;
    }

    public void setClientSecret(String clientSecret) {
        this.clientSecret = clientSecret;
    }
}
