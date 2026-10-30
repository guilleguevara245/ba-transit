package com.batransit.api.cuentas;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.RSAPublicKeySpec;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Verifica el "ID token" que devuelve el boton de Google (Google Identity
 * Services): firma RS256 con las claves publicas de Google, emisor,
 * destinatario (nuestro GOOGLE_CLIENT_ID), vencimiento y mail verificado.
 * Las claves se piden a Google y se guardan 6 horas.
 */
@Component
public class GoogleTokenVerifier {

    private static final Logger log = LoggerFactory.getLogger(GoogleTokenVerifier.class);

    static final String JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
    static final Set<String> ISSUERS = Set.of("accounts.google.com", "https://accounts.google.com");
    static final Duration KEYS_MAX_AGE = Duration.ofHours(6);
    /** Diferencia de reloj tolerada. */
    static final Duration SKEW = Duration.ofMinutes(1);

    /**
     * Lo que nos importa de la cuenta de Google. picture: su foto (solo si es
     * una direccion https de Google). givenName y familyName: nombre y
     * apellido por separado, si Google los da.
     */
    public record GoogleIdentity(String sub, String email, String name, String picture, String givenName,
                                 String familyName) {

        public GoogleIdentity(String sub, String email, String name, String picture) {
            this(sub, email, name, picture, null, null);
        }

        public GoogleIdentity(String sub, String email, String name) {
            this(sub, email, name, null, null, null);
        }
    }

    private final String clientId;
    private final ObjectMapper mapper;
    private final RestClient restClient;
    private final Clock clock;
    private Map<String, PublicKey> keys = Map.of();
    private Instant keysFetchedAt = Instant.EPOCH;

    @Autowired
    public GoogleTokenVerifier(@Value("${app.auth.google-client-id:}") String clientId, ObjectMapper mapper) {
        this(clientId, mapper, Clock.systemUTC());
    }

    GoogleTokenVerifier(String clientId, ObjectMapper mapper, Clock clock) {
        this.clientId = clientId == null ? "" : clientId.strip();
        this.mapper = mapper;
        this.clock = clock;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5_000);
        requestFactory.setReadTimeout(10_000);
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    public boolean isConfigured() {
        return !clientId.isEmpty();
    }

    public String clientId() {
        return clientId;
    }

    /** La identidad si el token es valido; vacio si no. */
    public Optional<GoogleIdentity> verify(String idToken) {
        if (!isConfigured() || idToken == null) {
            return Optional.empty();
        }
        String[] parts = idToken.split("\\.");
        if (parts.length != 3) {
            return Optional.empty();
        }
        try {
            JsonNode header = mapper.readTree(Base64.getUrlDecoder().decode(parts[0]));
            if (!"RS256".equals(header.path("alg").asText())) {
                return Optional.empty();
            }
            PublicKey key = key(header.path("kid").asText());
            if (key == null) {
                return Optional.empty();
            }
            Signature verifier = Signature.getInstance("SHA256withRSA");
            verifier.initVerify(key);
            verifier.update((parts[0] + "." + parts[1]).getBytes(StandardCharsets.US_ASCII));
            if (!verifier.verify(Base64.getUrlDecoder().decode(parts[2]))) {
                return Optional.empty();
            }
            return checkClaims(mapper.readTree(Base64.getUrlDecoder().decode(parts[1])));
        } catch (Exception e) {
            log.info("Token de Google rechazado ({})", e.getClass().getSimpleName());
            return Optional.empty();
        }
    }

    Optional<GoogleIdentity> checkClaims(JsonNode claims) {
        Instant now = clock.instant();
        boolean audienceOk = clientId.equals(claims.path("aud").asText());
        boolean issuerOk = ISSUERS.contains(claims.path("iss").asText());
        boolean notExpired = Instant.ofEpochSecond(claims.path("exp").asLong(0)).plus(SKEW).isAfter(now);
        boolean verified = claims.path("email_verified").asBoolean(false)
                || "true".equals(claims.path("email_verified").asText());
        String sub = claims.path("sub").asText("");
        String email = claims.path("email").asText("");
        if (!audienceOk || !issuerOk || !notExpired || !verified || sub.isEmpty() || email.isEmpty()) {
            return Optional.empty();
        }
        String name = claims.path("name").asText(null);
        String picture = claims.path("picture").asText(null);
        if (picture != null && (!picture.startsWith("https://") || !picture.contains(".googleusercontent.com/") || picture.length() > 500)) {
            picture = null;
        }
        return Optional.of(new GoogleIdentity(sub, email.toLowerCase(java.util.Locale.ROOT), name, picture,
                claims.path("given_name").asText(null), claims.path("family_name").asText(null)));
    }

    private synchronized PublicKey key(String kid) {
        boolean stale = clock.instant().isAfter(keysFetchedAt.plus(KEYS_MAX_AGE));
        if (stale || !keys.containsKey(kid)) {
            refreshKeys();
        }
        return keys.get(kid);
    }

    private void refreshKeys() {
        try {
            JsonNode body = restClient.get().uri(JWKS_URL).retrieve().body(JsonNode.class);
            Map<String, PublicKey> fresh = parseKeys(body);
            if (!fresh.isEmpty()) {
                keys = fresh;
                keysFetchedAt = clock.instant();
            }
        } catch (RestClientException e) {
            log.warn("No se pudieron obtener las claves de Google ({})", e.getMostSpecificCause().getClass().getSimpleName());
        }
    }

    static Map<String, PublicKey> parseKeys(JsonNode jwks) {
        Map<String, PublicKey> result = new HashMap<>();
        if (jwks == null) {
            return result;
        }
        for (JsonNode k : jwks.path("keys")) {
            if (!"RSA".equals(k.path("kty").asText())) {
                continue;
            }
            try {
                BigInteger n = new BigInteger(1, Base64.getUrlDecoder().decode(k.path("n").asText()));
                BigInteger e = new BigInteger(1, Base64.getUrlDecoder().decode(k.path("e").asText()));
                result.put(k.path("kid").asText(), KeyFactory.getInstance("RSA").generatePublic(new RSAPublicKeySpec(n, e)));
            } catch (GeneralSecurityException | IllegalArgumentException ignored) {
                // Clave mal formada: se saltea.
            }
        }
        return result;
    }

    /** Para los tests: claves fijas sin salir a internet. */
    void setKeysForTests(Map<String, PublicKey> testKeys) {
        this.keys = testKeys;
        this.keysFetchedAt = clock.instant();
    }
}
