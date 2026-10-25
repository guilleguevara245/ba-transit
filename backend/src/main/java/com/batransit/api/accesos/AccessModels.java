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

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SegmentDefinition(@JsonProperty("nombre") String name, double lat, double lon) {
    }

    // ---- Datos de TomTom ----

    /** Lo que devuelve TomTom para el tramo mas cercano a un punto. */
    public record FlowData(double currentSpeed, double freeFlowSpeed, boolean roadClosure, String frc,
                           double confidence, List<double[]> geometry) {
    }

    // ---- Respuesta de la API ----

    public enum TrafficStatus { FLUIDO, DEMORADO, CONGESTIONADO, CORTADO, SIN_DATOS }

    public record SegmentReport(String name, TrafficStatus status, Integer currentSpeed, Integer freeFlowSpeed,
                                boolean checkLocation, List<double[]> geometry) {
    }

    public record AccessReport(String id, String name, String road, String connects, String operator,
                               List<SegmentReport> segments) {
    }

    public record AccessesResponse(boolean configured, Instant updatedAt, List<AccessReport> accesses) {
    }
}
