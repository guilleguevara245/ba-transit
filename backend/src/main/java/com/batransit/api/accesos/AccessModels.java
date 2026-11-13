package com.batransit.api.accesos;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.List;

/** Modelos del apartado Accesos (definiciones fijas y estado medido). */
public final class AccessModels {

    private AccessModels() {
    }

    // ---- Definiciones leidas de accesos.json ----

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Definitions(@JsonProperty("accesos") List<AccessDefinition> accesses) {
    }

    /**
     * Un acceso. roadNumbers son los numeros de ruta con que TomTom informa
     * los embotellamientos de esa autopista ("RN9", "RN8"): asi se sabe que
     * un embotellamiento es del acceso y no de una calle de al lado.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AccessDefinition(
            String id,
            @JsonProperty("nombre") String name,
            @JsonProperty("ruta") String road,
            @JsonProperty("conecta") String connects,
            @JsonProperty("concesionaria") String operator,
            @JsonProperty("tramos") List<SegmentDefinition> segments,
            @JsonProperty("rutasTomTom") List<String> roadNumbers) {

        public AccessDefinition {
            roadNumbers = roadNumbers == null ? List.of() : List.copyOf(roadNumbers);
        }

        public AccessDefinition(String id, String name, String road, String connects, String operator,
                                List<SegmentDefinition> segments) {
            this(id, name, road, connects, operator, segments, List.of());
        }
    }

    /**
     * Un tramo. lat/lon es un punto de referencia; si tiene "manos", se mide
     * cada calzada por separado (TomTom devuelve una sola mano por punto).
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SegmentDefinition(@JsonProperty("nombre") String name, double lat, double lon,
                                    @JsonProperty("manos") List<DirectionDefinition> directions) {

        public SegmentDefinition {
            directions = directions == null ? List.of() : List.copyOf(directions);
        }

        public SegmentDefinition(String name, double lat, double lon) {
            this(name, lat, lon, List.of());
        }
    }

    /** Un punto sobre una de las calzadas; towards: "CABA" o "Provincia". */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DirectionDefinition(@JsonProperty("hacia") String towards, double lat, double lon) {
    }

    // ---- Datos de TomTom ----

    /** Lo que devuelve TomTom para el tramo mas cercano a un punto. */
    public record FlowData(double currentSpeed, double freeFlowSpeed, boolean roadClosure, String frc,
                           double confidence, List<double[]> geometry) {
    }

    /**
     * Un incidente de TomTom (Traffic Incidents): category es su iconCategory
     * (6 = embotellamiento), magnitude su magnitudeOfDelay (1 leve, 2
     * moderado, 3 grave), from y to los nombres de donde empieza y termina,
     * y geometry los puntos [lat, lon] en el sentido de circulacion.
     */
    public record Incident(int category, int magnitude, String from, String to, int lengthMeters,
                           int delaySeconds, List<String> roadNumbers, List<double[]> geometry) {
    }

    // ---- Respuesta de la API ----

    public enum TrafficStatus { FLUIDO, DEMORADO, CONGESTIONADO, CORTADO, SIN_DATOS }

    /**
     * Estado del tramo. Si se miden las dos manos, status y velocidades son
     * los de la mano mas complicada, y directions trae el detalle de cada una.
     */
    public record SegmentReport(String name, TrafficStatus status, Integer currentSpeed, Integer freeFlowSpeed,
                                boolean checkLocation, List<double[]> geometry, List<DirectionReport> directions) {

        public SegmentReport(String name, TrafficStatus status, Integer currentSpeed, Integer freeFlowSpeed,
                             boolean checkLocation, List<double[]> geometry) {
            this(name, status, currentSpeed, freeFlowSpeed, checkLocation, geometry, List.of());
        }
    }

    /**
     * Una mano del tramo. jams son los embotellamientos que TomTom informa en
     * toda esa mano (no solo en el punto medido); si hay alguno, el estado
     * es por lo menos el que corresponde a su gravedad.
     */
    public record DirectionReport(String towards, TrafficStatus status, Integer currentSpeed, Integer freeFlowSpeed,
                                  List<double[]> geometry, List<Jam> jams) {

        public DirectionReport {
            jams = jams == null ? List.of() : List.copyOf(jams);
        }

        public DirectionReport(String towards, TrafficStatus status, Integer currentSpeed, Integer freeFlowSpeed,
                               List<double[]> geometry) {
            this(towards, status, currentSpeed, freeFlowSpeed, geometry, List.of());
        }
    }

    /** Un embotellamiento en una mano: largo, demora y entre que puntos (nombres de TomTom). */
    public record Jam(int lengthMeters, int delaySeconds, String from, String to, int magnitude) {
    }

    /** Un incidente de la ultima medicion y a que acceso, tramo y mano se asigno (null si a ninguno). */
    public record IncidentCheck(int category, int magnitude, String from, String to, int lengthMeters,
                                int delaySeconds, List<String> roadNumbers, double[] start, double[] end,
                                String access, String segment, String towards) {
    }

    public record IncidentsResponse(Instant updatedAt, List<IncidentCheck> incidents) {
    }

    public record AccessReport(String id, String name, String road, String connects, String operator,
                               List<SegmentReport> segments) {
    }

    public record AccessesResponse(boolean configured, Instant updatedAt, List<AccessReport> accesses) {
    }
}
