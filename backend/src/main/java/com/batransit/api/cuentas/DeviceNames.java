package com.batransit.api.cuentas;

/**
 * "Chrome en Windows", "Safari en iPhone": el navegador y el sistema, a
 * partir del User-Agent. Solo eso (sin version, IP ni ubicacion).
 */
public final class DeviceNames {

    static final String UNKNOWN = "Navegador desconocido";

    private DeviceNames() {
    }

    public static String describe(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return UNKNOWN;
        }
        String ua = userAgent;
        String browser;
        if (ua.contains("Edg/") || ua.contains("EdgA/") || ua.contains("EdgiOS/")) {
            browser = "Edge";
        } else if (ua.contains("OPR/") || ua.contains("Opera")) {
            browser = "Opera";
        } else if (ua.contains("SamsungBrowser/")) {
            browser = "Samsung Internet";
        } else if (ua.contains("Firefox/") || ua.contains("FxiOS/")) {
            browser = "Firefox";
        } else if (ua.contains("Chrome/") || ua.contains("CriOS/")) {
            browser = "Chrome";
        } else if (ua.contains("Safari/") && ua.contains("Version/")) {
            browser = "Safari";
        } else {
            browser = null;
        }
        String system;
        if (ua.contains("iPhone")) {
            system = "iPhone";
        } else if (ua.contains("iPad")) {
            system = "iPad";
        } else if (ua.contains("Android")) {
            system = "Android";
        } else if (ua.contains("CrOS")) {
            system = "ChromeOS";
        } else if (ua.contains("Windows")) {
            system = "Windows";
        } else if (ua.contains("Macintosh") || ua.contains("Mac OS X")) {
            system = "Mac";
        } else if (ua.contains("Linux")) {
            system = "Linux";
        } else {
            system = null;
        }
        if (browser == null && system == null) {
            return UNKNOWN;
        }
        if (browser == null) {
            return "Navegador en " + system;
        }
        return system == null ? browser : browser + " en " + system;
    }

    /** "celular", "tablet" o "computadora", para el icono. */
    public static String kind(String device) {
        if (device == null) {
            return "computadora";
        }
        if (device.endsWith("iPhone") || device.endsWith("Android")) {
            return "celular";
        }
        return device.endsWith("iPad") ? "tablet" : "computadora";
    }
}
