package com.batransit.api.notificaciones;

/**
 * Un aviso tal como lo muestra el navegador. icon: imagen chica de la
 * linea, estacion o acceso (archivos /notif/*.png del sitio); url: adonde
 * lleva al tocarlo; tag: agrupa (un aviso nuevo del mismo tag reemplaza al
 * anterior); action: el texto del boton; resolved: "volvio a la normalidad".
 */
public record PushMessage(String title, String body, String icon, String url, String tag, String action,
                          boolean resolved) {
}
