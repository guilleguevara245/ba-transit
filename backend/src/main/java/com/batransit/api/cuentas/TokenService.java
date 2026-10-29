package com.batransit.api.cuentas;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Sesiones sin estado: un token firmado con HMAC-SHA256 que dice que
 * usuario es y hasta cuando vale (30 dias). El sitio lo guarda y lo manda
 * en el header Authorization. La clave sale de AUTH_TOKEN_SECRET; si falta,
 * se inventa una al arrancar (las sesiones se pierden con cada reinicio).
 */
@Component
public class TokenService {

    private static final Logger log = LoggerFactory.getLogger(TokenService.class);

    static final Duration VALIDITY = Duration.ofDays(30);
    private static final Pattern PAYLOAD = Pattern.compile("^\\{\"sub\":(\\d{1,18}),\"exp\":(\\d{1,12})}$");

    private final byte[] secret;
    private final Clock clock;

    @Autowired
    public TokenService(@Value("${app.auth.token-secret:}") String secret) {
        this(secret, Clock.systemUTC());
    }

    TokenService(String secret, Clock clock) {
        this.clock = clock;
        if (secret == null || secret.length() < 32) {
            if (secret != null && !secret.isBlank()) {
                log.warn("AUTH_TOKEN_SECRET es muy corta (menos de 32 caracteres): se usa una clave temporal");
            } else {
                log.warn("Falta AUTH_TOKEN_SECRET: se usa una clave temporal y las sesiones se pierden al reiniciar");
            }
            byte[] random = new byte[32];
            new SecureRandom().nextBytes(random);
            this.secret = random;
        } else {
            this.secret = secret.getBytes(StandardCharsets.UTF_8);
        }
    }

    public String issue(long userId) {
        long exp = clock.instant().plus(VALIDITY).getEpochSecond();
        String payload = b64(("{\"sub\":" + userId + ",\"exp\":" + exp + "}").getBytes(StandardCharsets.UTF_8));
        return payload + "." + b64(sign(payload));
    }

    /** El id del usuario si el token es valido y no vencio. */
    public Optional<Long> verify(String token) {
        if (token == null) {
            return Optional.empty();
        }
        int dot = token.indexOf('.');
        if (dot <= 0 || dot != token.lastIndexOf('.')) {
            return Optional.empty();
        }
        String payload = token.substring(0, dot);
        try {
            byte[] signature = Base64.getUrlDecoder().decode(token.substring(dot + 1));
            if (!MessageDigest.isEqual(signature, sign(payload))) {
                return Optional.empty();
            }
            Matcher m = PAYLOAD.matcher(new String(Base64.getUrlDecoder().decode(payload), StandardCharsets.UTF_8));
            if (!m.matches() || Instant.ofEpochSecond(Long.parseLong(m.group(2))).isBefore(clock.instant())) {
                return Optional.empty();
            }
            return Optional.of(Long.parseLong(m.group(1)));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    /** Lee "Authorization: Bearer <token>". */
    public Optional<Long> fromHeader(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return Optional.empty();
        }
        return verify(authorization.substring(7).strip());
    }

    private byte[] sign(String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HMAC no disponible", e);
        }
    }

    private static String b64(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
