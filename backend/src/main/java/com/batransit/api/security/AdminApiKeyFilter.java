package com.batransit.api.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Set;

/**
 * Protege los endpoints de escritura (POST/PUT/PATCH/DELETE bajo
 * /api/) con una clave de administrador enviada en el header
 * X-API-Key. Las lecturas (GET) siguen siendo publicas.
 *
 * Si ADMIN_API_KEY no esta configurada, la escritura queda
 * deshabilitada por completo: es mas seguro fallar cerrado que dejar
 * los POST abiertos por olvidarse una variable de entorno.
 *
 * Se eligio un filtro simple en vez de Spring Security porque la API
 * no tiene usuarios ni sesiones: solo hay que distinguir "lectura
 * publica" de "escritura del administrador".
 */
@Component
public class AdminApiKeyFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-API-Key";

    private static final Set<String> WRITE_METHODS = Set.of(
            HttpMethod.POST.name(), HttpMethod.PUT.name(), HttpMethod.PATCH.name(), HttpMethod.DELETE.name());

    private final byte[] expectedKey;

    public AdminApiKeyFilter(@Value("${app.admin-api-key:}") String adminApiKey) {
        this.expectedKey = adminApiKey == null ? new byte[0] : adminApiKey.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !WRITE_METHODS.contains(request.getMethod())
                || !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        if (expectedKey.length == 0) {
            reject(response, HttpStatus.FORBIDDEN,
                    "La escritura esta deshabilitada: el servidor no tiene ADMIN_API_KEY configurada.");
            return;
        }

        String provided = request.getHeader(HEADER);
        // MessageDigest.isEqual compara en tiempo constante, para no
        // filtrar informacion sobre la clave por diferencias de tiempo.
        if (provided == null
                || !MessageDigest.isEqual(expectedKey, provided.getBytes(StandardCharsets.UTF_8))) {
            reject(response, HttpStatus.UNAUTHORIZED,
                    "Falta el header " + HEADER + " o la clave no es valida.");
            return;
        }

        chain.doFilter(request, response);
    }

    private static void reject(HttpServletResponse response, HttpStatus status, String detail) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write("{\"type\":\"about:blank\",\"title\":\"" + status.getReasonPhrase()
                + "\",\"status\":" + status.value() + ",\"detail\":\"" + detail + "\"}");
    }
}
