package com.batransit.api.cuentas;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Contrasenas con PBKDF2-HMAC-SHA256 (incluido en Java, sin dependencias):
 * sal al azar por usuario y 210.000 iteraciones (la recomendacion de OWASP
 * para este algoritmo). Formato guardado: pbkdf2$iteraciones$sal$hash.
 * Nunca se guarda ni se loguea la contrasena.
 */
public final class PasswordHasher {

    static final int ITERATIONS = 210_000;
    private static final int SALT_BYTES = 16;
    private static final int HASH_BITS = 256;
    private static final SecureRandom RANDOM = new SecureRandom();

    private PasswordHasher() {
    }

    public static String hash(String password) {
        byte[] salt = new byte[SALT_BYTES];
        RANDOM.nextBytes(salt);
        return format(ITERATIONS, salt, derive(password, salt, ITERATIONS));
    }

    /** Compara en tiempo constante. Un hash con formato desconocido no coincide nunca. */
    public static boolean matches(String password, String stored) {
        if (password == null || stored == null) {
            return false;
        }
        String[] parts = stored.split("\\$");
        if (parts.length != 4 || !parts[0].equals("pbkdf2")) {
            return false;
        }
        try {
            int iterations = Integer.parseInt(parts[1]);
            byte[] salt = Base64.getDecoder().decode(parts[2]);
            byte[] expected = Base64.getDecoder().decode(parts[3]);
            return MessageDigest.isEqual(expected, derive(password, salt, iterations));
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private static byte[] derive(String password, byte[] salt, int iterations) {
        PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), salt, iterations, HASH_BITS);
        try {
            return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("PBKDF2 no disponible", e);
        } finally {
            spec.clearPassword();
        }
    }

    private static String format(int iterations, byte[] salt, byte[] hash) {
        Base64.Encoder b64 = Base64.getEncoder();
        return "pbkdf2$" + iterations + "$" + b64.encodeToString(salt) + "$" + b64.encodeToString(hash);
    }
}
