package com.batransit.api.notificaciones;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.security.GeneralSecurityException;
import java.security.KeyPair;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.util.Base64;

/**
 * Claves VAPID del servidor (identifican a BA Transit ante los servicios
 * de avisos de Google, Mozilla y Apple). Se generan solas la primera vez y
 * se guardan en la base (app_setting): no hace falta configurar nada, y si
 * cambiaran, todas las suscripciones dejarian de funcionar.
 */
@Component
public class VapidKeys {

    private static final Logger log = LoggerFactory.getLogger(VapidKeys.class);
    static final String PUBLIC = "vapid.public";
    static final String PRIVATE = "vapid.private";

    private final PushStore store;
    private volatile byte[] publicKey;
    private volatile ECPrivateKey privateKey;

    public VapidKeys(PushStore store) {
        this.store = store;
    }

    /** Clave publica (punto P-256 sin comprimir) en base64url, para el navegador. */
    public String publicKeyBase64() {
        load();
        return Base64.getUrlEncoder().withoutPadding().encodeToString(publicKey);
    }

    public byte[] publicKey() {
        load();
        return publicKey;
    }

    public ECPrivateKey privateKey() {
        load();
        return privateKey;
    }

    private synchronized void load() {
        if (privateKey != null) {
            return;
        }
        Base64.Encoder enc = Base64.getUrlEncoder().withoutPadding();
        if (store.setting(PRIVATE).isEmpty()) {
            KeyPair pair = WebPushCrypto.generateKeyPair();
            store.saveSettingIfAbsent(PUBLIC, enc.encodeToString(WebPushCrypto.encodePoint((ECPublicKey) pair.getPublic())));
            store.saveSettingIfAbsent(PRIVATE, enc.encodeToString(WebPushCrypto.encodePrivate((ECPrivateKey) pair.getPrivate())));
            log.info("Avisos: se generaron las claves VAPID del servidor");
        }
        try {
            Base64.Decoder dec = Base64.getUrlDecoder();
            byte[] pub = dec.decode(store.setting(PUBLIC).orElseThrow());
            ECPrivateKey priv = WebPushCrypto.decodePrivate(dec.decode(store.setting(PRIVATE).orElseThrow()));
            WebPushCrypto.decodePoint(pub); // valida
            publicKey = pub;
            privateKey = priv;
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Las claves VAPID guardadas no son validas", e);
        }
    }
}
