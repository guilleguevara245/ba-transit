package com.batransit.api.vuelos;

import java.time.Instant;
import java.util.List;

/** Modelos de la seccion de aviones en vivo. */
public final class FlightModels {

    private FlightModels() {
    }

    /** Que esta haciendo el avion respecto de los aeropuertos de Buenos Aires. */
    public enum Phase { LANDING, DEPARTING, GROUND, NEAR, CRUISE }

    /**
     * Un avion. altitude en metros (null si no la informa), speed en km/h,
     * heading en grados (0 = norte), verticalRate en m/s (negativo = baja).
     * airport: AEP o EZE si esta aterrizando, despegando o en tierra ahi.
     */
    public record Flight(String id, String callsign, String airline, String registration, String aircraftType, double latitude,
                         double longitude, Double altitude, boolean onGround, Double speed, Double heading,
                         Double verticalRate, Phase phase, String airport) {
    }

    /**
     * refreshSeconds: cada cuanto conviene volver a pedir.
     * updatedAt: cuando se obtuvieron los datos (null si todavia no hay).
     */
    public record FlightsResponse(int refreshSeconds, Instant updatedAt, List<Flight> flights) {
    }
}
