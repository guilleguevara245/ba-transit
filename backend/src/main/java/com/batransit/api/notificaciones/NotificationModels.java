package com.batransit.api.notificaciones;

import com.batransit.api.cuentas.AccountModels.Favorites;

/** Pedidos y respuestas de los avisos. */
public final class NotificationModels {

    private NotificationModels() {
    }

    /** Lo que da el navegador al suscribirse (PushSubscription.toJSON()). */
    public record Keys(String p256dh, String auth) {
    }

    /**
     * Activar o actualizar los avisos de este navegador. kinds: tipos
     * elegidos ("lineas", "estaciones", "accesos"); quietFrom/quietTo:
     * horas sin avisos (0-23, hora de Buenos Aires), ambos null = sin pausa.
     */
    public record SubscribeRequest(String endpoint, Keys keys, Favorites favorites, java.util.List<String> kinds,
                                   Boolean notifyResolved, Integer quietFrom, Integer quietTo) {
    }

    public record EndpointRequest(String endpoint) {
    }

    public record PublicKey(String publicKey) {
    }
}
