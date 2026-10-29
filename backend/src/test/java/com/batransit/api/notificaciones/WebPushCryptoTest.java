package com.batransit.api.notificaciones;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.Signature;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.util.Arrays;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;

class WebPushCryptoTest {

    private static final Base64.Decoder D = Base64.getUrlDecoder();

    /** Ejemplo del RFC 8291 (apendice A): con las mismas claves y sal, el cuerpo tiene que ser identico. */
    @Test
    void cifradoIgualAlEjemploDelRfc() throws Exception {
        ECPrivateKey asPrivate = WebPushCrypto.decodePrivate(D.decode("yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw"));
        ECPublicKey asPublic = WebPushCrypto.decodePoint(D.decode(
                "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8"));
        byte[] uaPublic = D.decode("BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4");
        byte[] auth = D.decode("BTBZMqHH6r4Tts7J_aSIgg");
        byte[] salt = D.decode("DGv6ra1nlYgDCS1FRnbzlw");

        byte[] body = WebPushCrypto.encrypt("When I grow up, I want to be a watermelon".getBytes(StandardCharsets.UTF_8),
                uaPublic, auth, new KeyPair(asPublic, asPrivate), salt);

        assertThat(Base64.getUrlEncoder().withoutPadding().encodeToString(body)).isEqualTo(
                "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_"
                        + "yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN");
    }

    @Test
    void clavesIdaYVuelta() throws Exception {
        KeyPair pair = WebPushCrypto.generateKeyPair();
        byte[] point = WebPushCrypto.encodePoint((ECPublicKey) pair.getPublic());
        assertThat(point.length).isEqualTo(65);
        assertThat(WebPushCrypto.decodePoint(point).getW()).isEqualTo(((ECPublicKey) pair.getPublic()).getW());
        byte[] d = WebPushCrypto.encodePrivate((ECPrivateKey) pair.getPrivate());
        assertThat(WebPushCrypto.decodePrivate(d).getS()).isEqualTo(((ECPrivateKey) pair.getPrivate()).getS());
    }

    /** La firma VAPID es un JWT ES256 que se puede verificar con la clave publica. */
    @Test
    void firmaVapidVerificable() throws Exception {
        KeyPair pair = WebPushCrypto.generateKeyPair();
        byte[] pub = WebPushCrypto.encodePoint((ECPublicKey) pair.getPublic());
        String header = WebPushCrypto.vapidAuthorization("https://fcm.googleapis.com", "https://ba-transit.onrender.com",
                1_900_000_000L, (ECPrivateKey) pair.getPrivate(), pub);

        assertThat(header.startsWith("vapid t=")).isEqualTo(true);
        String jwt = header.substring(8, header.indexOf(", k="));
        String k = header.substring(header.indexOf(", k=") + 4);
        assertThat(Arrays.equals(D.decode(k), pub)).isEqualTo(true);

        String[] parts = jwt.split("\\.");
        String claims = new String(D.decode(parts[1]), StandardCharsets.UTF_8);
        assertThat(claims).isEqualTo("{\"aud\":\"https://fcm.googleapis.com\",\"exp\":1900000000,\"sub\":\"https://ba-transit.onrender.com\"}");
        byte[] raw = D.decode(parts[2]);
        assertThat(raw.length).isEqualTo(64);

        Signature verifier = Signature.getInstance("SHA256withECDSAinP1363Format");
        verifier.initVerify(pair.getPublic());
        verifier.update((parts[0] + "." + parts[1]).getBytes(StandardCharsets.US_ASCII));
        assertThat(verifier.verify(raw)).isEqualTo(true);
    }

    @Test
    void soloServiciosDeAvisosConocidos() {
        assertThat(WebPushSender.isPushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).isEqualTo(true);
        assertThat(WebPushSender.isPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/x")).isEqualTo(true);
        assertThat(WebPushSender.isPushEndpoint("https://web.push.apple.com/QX")).isEqualTo(true);
        assertThat(WebPushSender.isPushEndpoint("https://wns2-par02p.notify.windows.com/w/?token=1")).isEqualTo(true);
        assertThat(WebPushSender.isPushEndpoint("http://fcm.googleapis.com/x")).isEqualTo(false);
        assertThat(WebPushSender.isPushEndpoint("https://evil.example/fcm.googleapis.com")).isEqualTo(false);
        assertThat(WebPushSender.isPushEndpoint("https://fcm.googleapis.com.evil.example/x")).isEqualTo(false);
        assertThat(WebPushSender.isPushEndpoint("https://localhost/x")).isEqualTo(false);
    }
}
