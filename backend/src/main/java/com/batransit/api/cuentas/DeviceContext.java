package com.batransit.api.cuentas;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * El dispositivo del pedido en curso ("Chrome en Windows"), para anotarlo
 * al abrir una sesion. Lo completa este filtro en los pedidos de cuentas;
 * fuera de un pedido (tests) es "Navegador desconocido".
 */
@Component
public class DeviceContext extends OncePerRequestFilter {

    private static final ThreadLocal<String> CURRENT = new ThreadLocal<>();

    public static String current() {
        String device = CURRENT.get();
        return device == null ? DeviceNames.UNKNOWN : device;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return !uri.startsWith("/api/v1/auth/") && !uri.startsWith("/api/v1/cuenta");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        CURRENT.set(DeviceNames.describe(request.getHeader("User-Agent")));
        try {
            chain.doFilter(request, response);
        } finally {
            CURRENT.remove();
        }
    }
}
