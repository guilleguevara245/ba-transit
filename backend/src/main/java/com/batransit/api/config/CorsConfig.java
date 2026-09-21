package com.batransit.api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Habilita CORS solo para el frontend en desarrollo (Vite, puerto 5173).
 * Sin esto, el navegador bloquea las llamadas fetch() del frontend a
 * esta API por venir de un origen distinto (localhost:5173 vs
 * localhost:8080), aunque ambos corran en la misma maquina.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:5173")
                .allowedMethods("GET", "POST")
                .allowedHeaders("*");
    }
}
