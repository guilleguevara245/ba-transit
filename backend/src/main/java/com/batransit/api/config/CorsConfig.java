package com.batransit.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Habilita CORS para el/los origen(es) del frontend. Configurable por
 * variable de entorno (FRONTEND_ORIGINS, separados por coma) para no
 * tener que hardcodear ni redeployar cuando cambie el dominio de
 * produccion. En local, cae sola al puerto de Vite (5173).
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${app.frontend-origins:http://localhost:5173}")
    private String frontendOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String[] origins = frontendOrigins.split(",");
        registry.addMapping("/api/**")
                .allowedOriginPatterns(origins)
                .allowedMethods("GET", "POST", "PUT", "DELETE")
                .allowedHeaders("*");
    }
}
