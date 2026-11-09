package com.batransit.api.cuentas;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Contrasenas con PBKDF2 (incluido en Java, sin dependencias) y sal al azar
 * por usuario. Las nuevas usan HMAC-SHA512 con 210.000 iteraciones, la
 * recomendacion de OWASP para ese algoritmo. Formato guardado:
 * pbkdf2-sha512$iteraciones$sal$hash.
 *
 * Las guardadas antes usan HMAC-SHA256 con 210.000 iteraciones (formato
 * pbkdf2$iteraciones$sal$hash): siguen sirviendo para entrar y, al entrar,
 * se vuelven a guardar con el formato nuevo (ver needsRehash). Para SHA256,
 * OWASP pide 600.000 iteraciones, que en el CPU del servidor tardaban
 * varios segundos por ingreso; SHA512 da la misma proteccion con menos.
 *
 * Nunca se guarda ni se loguea la contrasena.
 */
public final class PasswordHasher {

    static final int ITERATIONS = 210_000;
    static final String PREFIX = "pbkdf2-sha512";
    /** El formato anterior (HMAC-SHA256). */
    static final String LEGACY_PREFIX = "pbkdf2";
    private static final int SALT_BYTES = 16;
    private static final SecureRandom RANDOM = new SecureRandom();

    private PasswordHasher() {
    }

    public static String hash(String password) {
        byte[] salt = new byte[SALT_BYTES];
        RANDOM.nextBytes(salt);
        return format(ITERATIONS, salt, derive(password, salt, ITERATIONS, PREFIX));
    }

    /** Compara en tiempo constante. Un hash con formato desconocido no coincide nunca. */
    public static boolean matches(String password, String stored) {
        if (password == null || stored == null) {
            return false;
        }
        String[] parts = stored.split("\\$");
        if (parts.length != 4 || !(parts[0].equals(PREFIX) || parts[0].equals(LEGACY_PREFIX))) {
            return false;
        }
        try {
            int iterations = Integer.parseInt(parts[1]);
            byte[] salt = Base64.getDecoder().decode(parts[2]);
            byte[] expected = Base64.getDecoder().decode(parts[3]);
            return MessageDigest.isEqual(expected, derive(password, salt, iterations, parts[0]));
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    /** Si un hash guardado es del formato anterior (o con menos iteraciones) y conviene rehacerlo al entrar. */
    public static boolean needsRehash(String stored) {
        if (stored == null) {
            return false;
        }
        String[] parts = stored.split("\\$");
        if (parts.length != 4 || !parts[0].equals(PREFIX)) {
            return true;
        }
        try {
            return Integer.parseInt(parts[1]) < ITERATIONS;
        } catch (NumberFormatException e) {
            return true;
        }
    }

    private static byte[] derive(String password, byte[] salt, int iterations, String prefix) {
        boolean sha512 = prefix.equals(PREFIX);
        PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), salt, iterations, sha512 ? 512 : 256);
        try {
            return SecretKeyFactory.getInstance(sha512 ? "PBKDF2WithHmacSHA512" : "PBKDF2WithHmacSHA256")
                    .generateSecret(spec).getEncoded();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("PBKDF2 no disponible", e);
        } finally {
            spec.clearPassword();
        }
    }

    private static String format(int iterations, byte[] salt, byte[] hash) {
        Base64.Encoder b64 = Base64.getEncoder();
        return PREFIX + "$" + iterations + "$" + b64.encodeToString(salt) + "$" + b64.encodeToString(hash);
    }
}
