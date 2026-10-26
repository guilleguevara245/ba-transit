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

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AccessDefinition(
            String id,
            @JsonProperty("nombre") String name,
            @JsonProperty("ruta") String road,
            @JsonProperty("conecta") String connects,
            @JsonProperty("concesionaria") String operator,
            @JsonProperty("tramos") List<SegmentDefinition> segments) {
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

    public record DirectionReport(String towards, TrafficStatus status, Integer currentSpeed, Integer freeFlowSpeed,
                                  List<double[]> geometry) {
    }

    public record AccessReport(String id, String name, String road, String connects, String operator,
                               List<SegmentReport> segments) {
    }

    public record AccessesResponse(boolean configured, Instant updatedAt, List<AccessReport> accesses) {
    }
}
