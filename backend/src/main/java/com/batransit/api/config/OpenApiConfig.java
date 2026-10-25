package com.batransit.api.config;

import com.batransit.api.security.AdminApiKeyFilter;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Metadatos de la documentacion OpenAPI. La documentacion interactiva
 * queda en /swagger-ui.html y la especificacion en /v3/api-docs.
 */
@Configuration
public class OpenApiConfig {

    public static final String API_KEY_SCHEME = "apiKey";

    @Bean
    public OpenAPI baTransitOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("BA Transit API")
                        .version("v1")
                        .description("Informacion de transporte publico del AMBA: lineas, ramales, "
                                + "estaciones, alertas de servicio, tarifas, mapa y estadisticas. "
                                + "Las lecturas son publicas; las escrituras requieren el header "
                                + AdminApiKeyFilter.HEADER + ".")
                        .license(new License().name("MIT")))
                .components(new Components()
                        .addSecuritySchemes(API_KEY_SCHEME, new SecurityScheme()
                                .type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.HEADER)
                                .name(AdminApiKeyFilter.HEADER)));
    }
}
