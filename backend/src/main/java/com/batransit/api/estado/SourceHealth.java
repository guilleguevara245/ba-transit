package com.batransit.api.estado;

import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Registro, en memoria, de como le fue a cada fuente de datos la ultima vez
 * que se la consulto: cuando respondio bien, cuando fallo y por que. Lo usa
 * la pagina "Estado de los datos". Se reinicia con el servicio.
 */
@Component
public class SourceHealth {

    /** Para clases que se crean sin Spring (tests): no registra nada. */
    public static final SourceHealth NOOP = new SourceHealth(Clock.systemUTC()) {
        @Override
        public void ok(Source source) {
        }

        @Override
        public void fail(Source source, String reason) {
        }
    };

    public enum Status { OK, ERROR, SIN_DATOS }

    /** Las fuentes, en el orden en que se muestran. */
    public enum Source {
        SUBTE_ALERTAS("Alertas del subte", "API Transporte (Gobierno de la Ciudad)"),
        TRANSPORTE_VIVO("Subte, colectivos y EcoBici en vivo", "API Transporte (Gobierno de la Ciudad)"),
        COLECTIVOS_RECORRIDOS("Recorridos de colectivos", "API Transporte (Gobierno de la Ciudad)"),
        SUBTE_HORARIO("Horario programado del subte", "API Transporte (Gobierno de la Ciudad)"),
        TRENES_AVISOS("Avisos de los trenes", "Trenes Argentinos"),
        FERROVIAS("Próximos trenes del Belgrano Norte", "Ferrovías"),
        METROVIAS("Estado del Urquiza", "Metrovías"),
        SMN("Alertas meteorológicas", "Servicio Meteorológico Nacional"),
        TOMTOM("Tránsito en los accesos", "TomTom"),
        ADSB_LOL("Aviones en vivo", "adsb.lol"),
        BREVO("Mails de la cuenta (recuperar la contraseña)", "Brevo");

        private final String what;
        private final String provider;

        Source(String what, String provider) {
            this.what = what;
            this.provider = provider;
        }

        public String what() {
            return what;
        }

        public String provider() {
            return provider;
        }
    }

    public record Check(String key, String what, String provider, Status status, Instant lastSuccess,
                        Instant lastFailure, String lastError) {
    }

    /** failures: fallas seguidas desde el ultimo exito. */
    private record Entry(Instant lastSuccess, Instant lastFailure, String lastError, int failures) {
    }

    /**
     * Fallas seguidas para considerar caida una fuente que ya respondio: una
     * sola (un timeout aislado) no alcanza, porque se reintenta enseguida.
     */
    static final int FAILURES_FOR_ERROR = 2;

    private final Clock clock;
    private final Map<Source, Entry> entries = new ConcurrentHashMap<>();


    public SourceHealth() {
        this(Clock.systemUTC());
    }

    SourceHealth(Clock clock) {
        this.clock = clock;
    }

    public void ok(Source source) {
        Instant now = clock.instant();
        entries.merge(source, new Entry(now, null, null, 0),
                (old, fresh) -> new Entry(now, old.lastFailure(), old.lastError(), 0));
    }

    /** reason: motivo corto y sin datos sensibles ("HTTP 503", "SocketTimeoutException"). */
    public void fail(Source source, String reason) {
        Instant now = clock.instant();
        entries.merge(source, new Entry(null, now, reason, 1),
                (old, fresh) -> new Entry(old.lastSuccess(), now, reason, old.failures() + 1));
    }

    public List<Check> checks() {
        List<Check> result = new ArrayList<>();
        Map<Source, Entry> snapshot = new LinkedHashMap<>(entries);
        for (Source source : Source.values()) {
            Entry e = snapshot.get(source);
            Status status;
            if (e == null) {
                status = Status.SIN_DATOS;
            } else if (e.failures() > 0 && (e.lastSuccess() == null || e.failures() >= FAILURES_FOR_ERROR)) {
                status = Status.ERROR;
            } else {
                status = Status.OK;
            }
            result.add(new Check(source.name().toLowerCase().replace('_', '-'), source.what(), source.provider(),
                    status, e == null ? null : e.lastSuccess(), e == null ? null : e.lastFailure(),
                    e == null ? null : e.lastError()));
        }
        return result;
    }
}
