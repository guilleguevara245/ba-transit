package com.batransit.api.vuelos;

import com.batransit.api.vuelos.FlightModels.Flight;
import com.batransit.api.vuelos.FlightModels.FlightsResponse;
import com.batransit.api.vuelos.FlightModels.Phase;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Aviones en vivo alrededor de Buenos Aires. Se pide a OpenSky solo cuando
 * alguien mira la seccion y el ultimo dato ya es viejo: con cuenta, cada
 * 30 s como mucho (hasta 2880 creditos por dia, de 4000); sin cuenta, cada
 * 5 minutos (288, de 400). Si OpenSky falla se muestra lo ultimo que hubo.
 */
@Service
public class FlightService {

    static final Duration REGISTERED_MAX_AGE = Duration.ofSeconds(30);
    static final Duration ANONYMOUS_MAX_AGE = Duration.ofMinutes(5);
    /** Tras una falla no se reintenta enseguida. */
    static final Duration FAILURE_BACKOFF = Duration.ofMinutes(2);
    /**
     * Una posicion mas vieja que esto ya no dice donde esta el avion. En
     * tierra los aviones estacionados transmiten poco, asi que se les da
     * mas margen (no se mueven).
     */
    static final long MAX_POSITION_AGE_SECONDS = 120;
    static final long MAX_GROUND_POSITION_AGE_SECONDS = 900;

    record Airport(String code, String name, double latitude, double longitude) {
    }

    static final List<Airport> AIRPORTS = List.of(
            new Airport("AEP", "Aeroparque", -34.5592, -58.4156),
            new Airport("EZE", "Ezeiza", -34.8222, -58.5358));

    /** Distancia al aeropuerto para contar como "en tierra ahi". */
    static final double GROUND_RADIUS_KM = 4;
    /** Por debajo de esta altura y cerca de un aeropuerto, esta llegando o saliendo. */
    static final double APPROACH_ALTITUDE_M = 2500;
    static final double APPROACH_RADIUS_KM = 35;
    /** Velocidad vertical (m/s) para considerar que sube o baja. */
    static final double CLIMB_RATE = 1.0;

    /** Prefijo OACI del indicativo -> aerolinea (las que suelen operar en Buenos Aires). */
    static final Map<String, String> AIRLINES = Map.ofEntries(
            Map.entry("ARG", "Aerolíneas Argentinas"),
            Map.entry("AUT", "Aerolíneas Argentinas"),
            Map.entry("JES", "JetSMART"),
            Map.entry("JAT", "JetSMART"),
            Map.entry("FBZ", "Flybondi"),
            Map.entry("LAN", "LATAM"),
            Map.entry("LPE", "LATAM"),
            Map.entry("TAM", "LATAM"),
            Map.entry("LXP", "LATAM"),
            Map.entry("LNE", "LATAM"),
            Map.entry("GLO", "GOL"),
            Map.entry("AZU", "Azul"),
            Map.entry("ANS", "Andes Líneas Aéreas"),
            Map.entry("LDE", "LADE"),
            Map.entry("AAL", "American Airlines"),
            Map.entry("DAL", "Delta"),
            Map.entry("UAL", "United"),
            Map.entry("IBE", "Iberia"),
            Map.entry("AEA", "Air Europa"),
            Map.entry("AFR", "Air France"),
            Map.entry("KLM", "KLM"),
            Map.entry("DLH", "Lufthansa"),
            Map.entry("BAW", "British Airways"),
            Map.entry("ITY", "ITA Airways"),
            Map.entry("UAE", "Emirates"),
            Map.entry("ETH", "Ethiopian"),
            Map.entry("THY", "Turkish Airlines"),
            Map.entry("CMP", "Copa"),
            Map.entry("AVA", "Avianca"),
            Map.entry("BOV", "BoA"),
            Map.entry("SKU", "SKY Airline"),
            Map.entry("AMX", "Aeroméxico"),
            Map.entry("ARE", "Avianca"));

    private final OpenSkyClient client;
    private final Clock clock;

    private FlightsResponse last;
    private Instant lastAttempt = Instant.EPOCH;
    private boolean lastAttemptFailed;

    public FlightService(OpenSkyClient client) {
        this(client, Clock.systemUTC());
    }

    FlightService(OpenSkyClient client, Clock clock) {
        this.client = client;
        this.clock = clock;
    }

    public synchronized FlightsResponse flights() {
        Instant now = clock.instant();
        Duration maxAge = client.isRegistered() ? REGISTERED_MAX_AGE : ANONYMOUS_MAX_AGE;
        Duration wait = lastAttemptFailed ? max(maxAge, FAILURE_BACKOFF) : maxAge;
        if (last == null || !now.isBefore(lastAttempt.plus(wait))) {
            lastAttempt = now;
            Optional<JsonNode> body = client.states();
            lastAttemptFailed = body.isEmpty();
            body.ifPresent(b -> last = new FlightsResponse(client.isRegistered(), (int) maxAge.toSeconds(), now, parse(b)));
        }
        if (last == null) {
            return new FlightsResponse(client.isRegistered(), (int) maxAge.toSeconds(), null, List.of());
        }
        return new FlightsResponse(client.isRegistered(), (int) maxAge.toSeconds(), last.updatedAt(), last.flights());
    }

    /** Convierte la respuesta de /states/all (cada estado es un arreglo, ver la doc de OpenSky). */
    static List<Flight> parse(JsonNode body) {
        long time = body.path("time").asLong(0);
        List<Flight> flights = new ArrayList<>();
        for (JsonNode s : body.path("states")) {
            if (!s.isArray() || s.get(5) == null || s.get(5).isNull() || s.get(6).isNull()) {
                continue;
            }
            JsonNode positionTime = s.get(3);
            long maxAge = s.get(8).asBoolean(false) ? MAX_GROUND_POSITION_AGE_SECONDS : MAX_POSITION_AGE_SECONDS;
            if (time > 0 && (positionTime == null || positionTime.isNull() || time - positionTime.asLong() > maxAge)) {
                continue;
            }
            String callsign = s.get(1).isNull() ? "" : s.get(1).asText().strip();
            double lon = s.get(5).asDouble();
            double lat = s.get(6).asDouble();
            boolean onGround = s.get(8).asBoolean(false);
            Double altitude = number(s.get(13));
            if (altitude == null) {
                altitude = number(s.get(7));
            }
            Double velocity = number(s.get(9));
            Double heading = number(s.get(10));
            Double verticalRate = number(s.get(11));
            Classification c = classify(lat, lon, onGround, altitude, verticalRate);
            flights.add(new Flight(
                    s.get(0).asText(),
                    callsign.isEmpty() ? null : callsign,
                    airline(callsign),
                    s.get(2).asText(null),
                    lat,
                    lon,
                    onGround ? null : round(altitude),
                    onGround,
                    velocity == null ? null : round(velocity * 3.6),
                    heading,
                    verticalRate,
                    c.phase(),
                    c.airport()));
        }
        flights.sort(Comparator.comparing((Flight f) -> f.phase().ordinal())
                .thenComparing(f -> f.callsign() == null ? "~" : f.callsign()));
        return flights;
    }

    record Classification(Phase phase, String airport) {
    }

    static Classification classify(double lat, double lon, boolean onGround, Double altitude, Double verticalRate) {
        Airport nearest = null;
        double nearestKm = Double.MAX_VALUE;
        for (Airport a : AIRPORTS) {
            double km = distanceKm(lat, lon, a.latitude(), a.longitude());
            if (km < nearestKm) {
                nearest = a;
                nearestKm = km;
            }
        }
        if (onGround) {
            return nearestKm <= GROUND_RADIUS_KM
                    ? new Classification(Phase.GROUND, nearest.code())
                    : new Classification(Phase.GROUND, null);
        }
        if (altitude != null && altitude < APPROACH_ALTITUDE_M && nearestKm <= APPROACH_RADIUS_KM) {
            if (verticalRate != null && verticalRate <= -CLIMB_RATE) {
                return new Classification(Phase.LANDING, nearest.code());
            }
            if (verticalRate != null && verticalRate >= CLIMB_RATE) {
                return new Classification(Phase.DEPARTING, nearest.code());
            }
            return new Classification(Phase.NEAR, nearest.code());
        }
        return new Classification(Phase.CRUISE, null);
    }

    static String airline(String callsign) {
        if (callsign == null || callsign.length() < 4 || !callsign.substring(0, 3).chars().allMatch(Character::isLetter)
                || !Character.isDigit(callsign.charAt(3))) {
            return null;
        }
        return AIRLINES.get(callsign.substring(0, 3).toUpperCase(Locale.ROOT));
    }

    static double distanceKm(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private static Double number(JsonNode node) {
        return node == null || node.isNull() || !node.isNumber() ? null : node.asDouble();
    }

    private static Double round(Double value) {
        return value == null ? null : (double) Math.round(value);
    }

    private static Duration max(Duration a, Duration b) {
        return a.compareTo(b) >= 0 ? a : b;
    }
}
