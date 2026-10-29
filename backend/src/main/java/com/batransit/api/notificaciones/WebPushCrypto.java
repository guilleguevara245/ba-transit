package com.batransit.api.notificaciones;

import javax.crypto.Cipher;
import javax.crypto.KeyAgreement;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayOutputStream;
import java.math.BigInteger;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.SecureRandom;
import java.security.Signature;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.ECParameterSpec;
import java.security.spec.ECPoint;
import java.security.spec.ECPrivateKeySpec;
import java.security.spec.ECPublicKeySpec;
import java.util.Arrays;
import java.util.Base64;

/**
 * Criptografia de Web Push con lo que trae Java (sin dependencias):
 * cifrado del mensaje (RFC 8291, "aes128gcm") y firma VAPID del servidor
 * (RFC 8292, JWT con ES256). Las claves son de la curva P-256.
 */
public final class WebPushCrypto {

    private static final SecureRandom RANDOM = new SecureRandom();
    static final int RECORD_SIZE = 4096;
    private static final ECParameterSpec P256 = p256();

    private WebPushCrypto() {
    }

    private static ECParameterSpec p256() {
        try {
            KeyPairGenerator g = KeyPairGenerator.getInstance("EC");
            g.initialize(new ECGenParameterSpec("secp256r1"));
            return ((ECPublicKey) g.generateKeyPair().getPublic()).getParams();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("P-256 no disponible", e);
        }
    }

    public static KeyPair generateKeyPair() {
        try {
            KeyPairGenerator g = KeyPairGenerator.getInstance("EC");
            g.initialize(new ECGenParameterSpec("secp256r1"), RANDOM);
            return g.generateKeyPair();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    /** Punto sin comprimir: 0x04 || X (32) || Y (32). */
    public static byte[] encodePoint(ECPublicKey key) {
        byte[] out = new byte[65];
        out[0] = 0x04;
        System.arraycopy(fixed(key.getW().getAffineX(), 32), 0, out, 1, 32);
        System.arraycopy(fixed(key.getW().getAffineY(), 32), 0, out, 33, 32);
        return out;
    }

    public static ECPublicKey decodePoint(byte[] point) throws GeneralSecurityException {
        if (point.length != 65 || point[0] != 0x04) {
            throw new GeneralSecurityException("Clave publica mal formada");
        }
        BigInteger x = new BigInteger(1, Arrays.copyOfRange(point, 1, 33));
        BigInteger y = new BigInteger(1, Arrays.copyOfRange(point, 33, 65));
        return (ECPublicKey) KeyFactory.getInstance("EC").generatePublic(new ECPublicKeySpec(new ECPoint(x, y), P256));
    }

    public static byte[] encodePrivate(ECPrivateKey key) {
        return fixed(key.getS(), 32);
    }

    public static ECPrivateKey decodePrivate(byte[] d) throws GeneralSecurityException {
        return (ECPrivateKey) KeyFactory.getInstance("EC").generatePrivate(new ECPrivateKeySpec(new BigInteger(1, d), P256));
    }

    /**
     * Cifra el mensaje para una suscripcion (p256dh y auth los da el
     * navegador). Devuelve el cuerpo listo para el POST, con
     * Content-Encoding: aes128gcm.
     */
    public static byte[] encrypt(byte[] payload, byte[] userAgentPublic, byte[] authSecret) throws GeneralSecurityException {
        return encrypt(payload, userAgentPublic, authSecret, generateKeyPair(), randomBytes(16));
    }

    static byte[] encrypt(byte[] payload, byte[] userAgentPublic, byte[] authSecret, KeyPair server, byte[] salt)
            throws GeneralSecurityException {
        if (payload.length > RECORD_SIZE - 17 - 86) {
            throw new GeneralSecurityException("Mensaje demasiado largo para un aviso");
        }
        ECPublicKey ua = decodePoint(userAgentPublic);
        byte[] serverPublic = encodePoint((ECPublicKey) server.getPublic());

        KeyAgreement agreement = KeyAgreement.getInstance("ECDH");
        agreement.init(server.getPrivate());
        agreement.doPhase(ua, true);
        byte[] ecdhSecret = agreement.generateSecret();

        byte[] keyInfo = concat("WebPush: info".getBytes(StandardCharsets.US_ASCII), new byte[] {0}, userAgentPublic, serverPublic);
        byte[] ikm = hkdf(authSecret, ecdhSecret, keyInfo, 32);
        byte[] cek = hkdf(salt, ikm, concat("Content-Encoding: aes128gcm".getBytes(StandardCharsets.US_ASCII), new byte[] {0}), 16);
        byte[] nonce = hkdf(salt, ikm, concat("Content-Encoding: nonce".getBytes(StandardCharsets.US_ASCII), new byte[] {0}), 12);

        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(cek, "AES"), new GCMParameterSpec(128, nonce));
        // Un solo registro: el mensaje y el delimitador 0x02 de "ultimo registro".
        byte[] ciphertext = cipher.doFinal(concat(payload, new byte[] {2}));

        ByteBuffer header = ByteBuffer.allocate(16 + 4 + 1 + serverPublic.length);
        header.put(salt).putInt(RECORD_SIZE).put((byte) serverPublic.length).put(serverPublic);
        return concat(header.array(), ciphertext);
    }

    /** HKDF-SHA256 (extraccion y una expansion; alcanza para hasta 32 bytes). */
    static byte[] hkdf(byte[] salt, byte[] ikm, byte[] info, int length) throws GeneralSecurityException {
        byte[] prk = hmac(salt, ikm);
        byte[] okm = hmac(prk, concat(info, new byte[] {1}));
        return Arrays.copyOf(okm, length);
    }

    static byte[] hmac(byte[] key, byte[] data) throws GeneralSecurityException {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, "HmacSHA256"));
        return mac.doFinal(data);
    }

    /**
     * Header Authorization de VAPID: un JWT firmado con la clave del
     * servidor para el origen del servicio de avisos (el "aud").
     */
    public static String vapidAuthorization(String audience, String subject, long expiresAtEpochSecond,
                                            ECPrivateKey privateKey, byte[] publicKey) throws GeneralSecurityException {
        Base64.Encoder b64 = Base64.getUrlEncoder().withoutPadding();
        String header = b64.encodeToString("{\"typ\":\"JWT\",\"alg\":\"ES256\"}".getBytes(StandardCharsets.UTF_8));
        String claims = b64.encodeToString(("{\"aud\":\"" + audience + "\",\"exp\":" + expiresAtEpochSecond
                + ",\"sub\":\"" + subject + "\"}").getBytes(StandardCharsets.UTF_8));
        String unsigned = header + "." + claims;
        Signature signer = Signature.getInstance("SHA256withECDSA");
        signer.initSign(privateKey);
        signer.update(unsigned.getBytes(StandardCharsets.US_ASCII));
        String jwt = unsigned + "." + b64.encodeToString(derToRaw(signer.sign()));
        return "vapid t=" + jwt + ", k=" + b64.encodeToString(publicKey);
    }

    /** Firma ECDSA de Java (DER) al formato de JWT: R || S de 32 bytes cada uno. */
    static byte[] derToRaw(byte[] der) {
        int offset = 2;
        if ((der[1] & 0x80) != 0) {
            offset += der[1] & 0x7f;
        }
        int rLength = der[offset + 1];
        byte[] r = Arrays.copyOfRange(der, offset + 2, offset + 2 + rLength);
        int sStart = offset + 2 + rLength;
        int sLength = der[sStart + 1];
        byte[] s = Arrays.copyOfRange(der, sStart + 2, sStart + 2 + sLength);
        return concat(fixed(new BigInteger(1, r), 32), fixed(new BigInteger(1, s), 32));
    }

    /** Un entero positivo en exactamente size bytes (sin el 0 de signo de BigInteger). */
    static byte[] fixed(BigInteger value, int size) {
        byte[] bytes = value.toByteArray();
        if (bytes.length == size) {
            return bytes;
        }
        byte[] out = new byte[size];
        if (bytes.length > size) {
            System.arraycopy(bytes, bytes.length - size, out, 0, size);
        } else {
            System.arraycopy(bytes, 0, out, size - bytes.length, bytes.length);
        }
        return out;
    }

    static byte[] randomBytes(int n) {
        byte[] out = new byte[n];
        RANDOM.nextBytes(out);
        return out;
    }

    static byte[] concat(byte[]... parts) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        for (byte[] p : parts) {
            out.writeBytes(p);
        }
        return out.toByteArray();
    }
}
