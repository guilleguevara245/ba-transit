package com.batransit.api.cuentas;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.Signature;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/** Contrasenas, sesiones, tokens de Google y el freno de intentos. */
class SecurityPiecesTest {

    private static final Instant NOW = Instant.parse("2026-10-29T21:00:00Z");

    @Test
    void contrasenas() {
        String hash = PasswordHasher.hash("mi clave segura");
        assertThat(PasswordHasher.matches("mi clave segura", hash)).isEqualTo(true);
        assertThat(PasswordHasher.matches("otra", hash)).isEqualTo(false);
        // Cada vez con otra sal.
        assertThat(PasswordHasher.hash("mi clave segura").equals(hash)).isEqualTo(false);
        assertThat(PasswordHasher.matches("x", "formato-raro")).isEqualTo(false);
        assertThat(PasswordHasher.matches(null, hash)).isEqualTo(false);
    }

    @Test
    void sesiones() {
        TokenService tokens = new TokenService("una-clave-de-pruebas-con-mas-de-32-caracteres", Clock.fixed(NOW, ZoneOffset.UTC));
        String token = tokens.issue(42);
        assertThat(tokens.verify(token)).isEqualTo(Optional.of(new TokenService.Claims(42, NOW)));
        assertThat(tokens.fromHeader("Bearer " + token).map(TokenService.Claims::userId)).isEqualTo(Optional.of(42L));
        assertThat(tokens.fromHeader(token)).isEqualTo(Optional.empty());

        // Modificado: otro usuario con la misma firma.
        String other = Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\"sub\":1,\"exp\":9999999999}".getBytes(StandardCharsets.UTF_8));
        assertThat(tokens.verify(other + token.substring(token.indexOf('.')))).isEqualTo(Optional.empty());
        // Firmado con otra clave.
        TokenService otherKey = new TokenService("otra-clave-distinta-de-pruebas-con-32-caracteres", Clock.fixed(NOW, ZoneOffset.UTC));
        assertThat(otherKey.verify(token)).isEqualTo(Optional.empty());
        // Vencido.
        TokenService later = new TokenService("una-clave-de-pruebas-con-mas-de-32-caracteres",
                Clock.fixed(NOW.plus(TokenService.VALIDITY).plusSeconds(1), ZoneOffset.UTC));
        assertThat(later.verify(token)).isEqualTo(Optional.empty());
        assertThat(tokens.verify("basura")).isEqualTo(Optional.empty());

        // Los tokens de la v18.9 (sin "iat") siguen valiendo, como emitidos en 1970.
        String old = b64("{\"sub\":7,\"exp\":" + NOW.plusSeconds(60).getEpochSecond() + "}");
        TokenService signer = new TokenService("una-clave-de-pruebas-con-mas-de-32-caracteres", Clock.fixed(NOW, ZoneOffset.UTC));
        String oldToken = old + "." + signer.signForTests(old);
        assertThat(signer.verify(oldToken)).isEqualTo(Optional.of(new TokenService.Claims(7, Instant.EPOCH)));
    }

    private static String b64(String json) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(json.getBytes(StandardCharsets.UTF_8));
    }

    private static String googleToken(KeyPair keys, String claims) throws Exception {
        String unsigned = b64("{\"alg\":\"RS256\",\"kid\":\"k1\",\"typ\":\"JWT\"}") + "." + b64(claims);
        Signature signer = Signature.getInstance("SHA256withRSA");
        signer.initSign(keys.getPrivate());
        signer.update(unsigned.getBytes(StandardCharsets.US_ASCII));
        return unsigned + "." + Base64.getUrlEncoder().withoutPadding().encodeToString(signer.sign());
    }

    @Test
    void tokensDeGoogle() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        KeyPair keys = generator.generateKeyPair();
        GoogleTokenVerifier verifier = new GoogleTokenVerifier("cliente.apps.googleusercontent.com", new ObjectMapper(),
                Clock.fixed(NOW, ZoneOffset.UTC));
        verifier.setKeysForTests(Map.of("k1", keys.getPublic()));
        long exp = NOW.plusSeconds(3600).getEpochSecond();
        String good = "{\"iss\":\"https://accounts.google.com\",\"aud\":\"cliente.apps.googleusercontent.com\",\"sub\":\"123\","
                + "\"email\":\"Ana@Gmail.com\",\"email_verified\":true,\"name\":\"Ana\",\"exp\":" + exp + "}";

        assertThat(verifier.verify(googleToken(keys, good)))
                .isEqualTo(Optional.of(new GoogleTokenVerifier.GoogleIdentity("123", "ana@gmail.com", "Ana")));
        // Para otra aplicacion, vencido o sin mail verificado: no.
        assertThat(verifier.verify(googleToken(keys, good.replace("cliente.apps", "otro.apps")))).isEqualTo(Optional.empty());
        assertThat(verifier.verify(googleToken(keys, good.replace(String.valueOf(exp), String.valueOf(NOW.minusSeconds(3600).getEpochSecond())))))
                .isEqualTo(Optional.empty());
        assertThat(verifier.verify(googleToken(keys, good.replace("\"email_verified\":true", "\"email_verified\":false"))))
                .isEqualTo(Optional.empty());
        // Firma de otra clave.
        KeyPair other = generator.generateKeyPair();
        assertThat(verifier.verify(googleToken(other, good))).isEqualTo(Optional.empty());
        assertThat(verifier.verify("no.es.unjwt")).isEqualTo(Optional.empty());
    }

    static class MovingClock extends Clock {
        Instant now = NOW;

        @Override
        public java.time.ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    @Test
    void frenoDeIntentos() {
        MovingClock clock = new MovingClock();
        LoginRateLimiter limiter = new LoginRateLimiter(clock);
        for (int i = 0; i < LoginRateLimiter.MAX_ATTEMPTS; i++) {
            assertThat(limiter.tryAcquire("ip:1")).isEqualTo(true);
        }
        assertThat(limiter.tryAcquire("ip:1")).isEqualTo(false);
        assertThat(limiter.tryAcquire("ip:2")).isEqualTo(true);
        clock.now = clock.now.plus(LoginRateLimiter.WINDOW).plus(Duration.ofSeconds(1));
        assertThat(limiter.tryAcquire("ip:1")).isEqualTo(true);
    }
}
