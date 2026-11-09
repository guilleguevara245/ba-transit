package com.batransit.api.security;

import jakarta.servlet.http.HttpServletRequest;

/**
 * La IP de quien hace el pedido, para los limites de intentos (ingreso,
 * registro, recuperar la contrasena, direcciones y aviso de prueba).
 *
 * El servidor esta en Render, detras de Cloudflare. Cloudflare pone la IP
 * real del visitante en CF-Connecting-IP y pisa la que el visitante mande
 * con ese nombre. La primera IP de X-Forwarded-For, en cambio, no sirve:
 * Render no borra lo que manda el visitante, solo le agrega al final, asi
 * que cada pedido podia traer una IP inventada distinta y nunca llegar al
 * limite. Sin CF-Connecting-IP se toma la ultima de X-Forwarded-For (la
 * que agrego el ultimo proxy) y, si tampoco esta (en local), la conexion.
 */
public final class ClientIp {

    static final String CLOUDFLARE = "CF-Connecting-IP";
    static final String FORWARDED = "X-Forwarded-For";
    /** Una IPv6 completa tiene 45 caracteres: algo mas largo no es una IP. */
    static final int MAX_LENGTH = 45;

    private ClientIp() {
    }

    public static String of(HttpServletRequest request) {
        String cloudflare = clean(request.getHeader(CLOUDFLARE));
        if (cloudflare != null) {
            return cloudflare;
        }
        String forwarded = request.getHeader(FORWARDED);
        if (forwarded != null) {
            String[] chain = forwarded.split(",");
            String last = clean(chain[chain.length - 1]);
            if (last != null) {
                return last;
            }
        }
        return request.getRemoteAddr();
    }

    private static String clean(String value) {
        if (value == null) {
            return null;
        }
        String ip = value.strip();
        return ip.isEmpty() || ip.length() > MAX_LENGTH ? null : ip;
    }
}
