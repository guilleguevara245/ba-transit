package com.batransit.api.trenes;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Proximos trenes del Belgrano Norte, leidos de la pantalla publica de
 * Ferrovias (proximostrenes.ferrovias.com.ar). Esa pagina le pide a
 * estaciones.asp (POST idEst=N) un pedazo de HTML con una tabla por
 * sentido:
 *
 *   <td class="table_title tdflecha2">VILLA ROSA</td> ...
 *     <td class="tdEst">GRAND BOURG</td>
 *     <td class="tdEst tdEstr tdflecha">8 min</td>
 *
 * El sentido es la cabecera hacia donde va el tren y cada fila trae el
 * destino real (puede ser un servicio corto, como Grand Bourg).
 */
public final class FerroviasArrivals {

    public static final String LINE_CODE = "BELGRANO_NORTE";
    static final int MAX_PER_DIRECTION = 3;

    /** Nombre de la estacion en la base -> numero de estacion de Ferrovias. */
    static final Map<String, Integer> STATION_IDS = new LinkedHashMap<>();
    /** Nombre que usa Ferrovias (normalizado) -> nombre en la base. */
    static final Map<String, String> NAMES = new LinkedHashMap<>();

    static {
        station("Retiro", 75, "RETIRO");
        station("Saldías", 78, "SALDIAS");
        station("Ciudad Universitaria", 80, "C. UNIVERSITARIA", "CIUDAD UNIVERSITARIA");
        station("Aristóbulo del Valle", 82, "A. DEL VALLE", "ARISTOBULO DEL VALLE");
        station("Padilla", 84, "PADILLA");
        station("Florida", 86, "FLORIDA");
        station("Munro", 88, "MUNRO");
        station("Carapachay", 130, "CARAPACHAY");
        station("Villa Adelina", 90, "VILLA ADELINA");
        station("Boulogne", 95, "BOULOGNE SUR MER", "BOULOGNE");
        station("Vice A. Montes", 97, "VCE. ALTE. MONTES", "VICE ALTE. MONTES", "VICE A. MONTES");
        station("Don Torcuato", 100, "DON TORCUATO");
        station("A. Sourdeaux", 103, "A. SOURDEAUX", "SOURDEAUX");
        station("Villa de Mayo", 105, "VILLA DE MAYO");
        station("Los Polvorines", 108, "LOS POLVORINES");
        station("Pablo Nogués", 111, "ING. PABLO NOGUES", "PABLO NOGUES");
        station("Grand Bourg", 113, "GRAND BOURG");
        station("Tierras Altas", 116, "TIERRAS ALTAS");
        station("Tortuguitas", 118, "TORTUGUITAS");
        station("Manuel Alberti", 120, "M. ALBERTI", "MANUEL ALBERTI");
        station("Del Viso", 123, "DEL VISO");
        station("Cecilia Grierson", 135, "C. GRIERSON", "CECILIA GRIERSON");
        station("Villa Rosa", 126, "VILLA ROSA");
    }

    private static void station(String name, int id, String... labels) {
        STATION_IDS.put(name, id);
        NAMES.put(normalize(name), name);
        for (String label : labels) {
            NAMES.put(normalize(label), name);
        }
    }

    private static final Pattern SECTION = Pattern.compile(
            "class=\"table_title[^\"]*\"[^>]*>(.*?)</td>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Pattern ROW = Pattern.compile(
            "<td class=\"tdEst\"[^>]*>(.*?)</td>\\s*<td class=\"tdEst tdEstr[^\"]*\"[^>]*>(.*?)</td>",
            Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Pattern HOURS = Pattern.compile("(\\d+)\\s*(?:h|hs|hora|horas)\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern MINUTES = Pattern.compile("(\\d+)\\s*(?:m|min|mins|minutos)?\\b", Pattern.CASE_INSENSITIVE);

    private FerroviasArrivals() {
    }

    public record Arrival(int minutes, boolean estimated, String destination) {
    }

    public record Direction(int directionId, String towards, List<Arrival> arrivals) {
    }

    /** Numero de estacion de Ferrovias para un nombre de la base (o null si no la conoce). */
    public static Integer stationId(String stationName) {
        String name = NAMES.get(normalize(stationName));
        return name == null ? null : STATION_IDS.get(name);
    }

    /** Arma los sentidos a partir del HTML de estaciones.asp. */
    public static List<Direction> parse(String html) {
        List<Direction> result = new ArrayList<>();
        if (html == null) {
            return result;
        }
        Matcher section = SECTION.matcher(html);
        List<int[]> bounds = new ArrayList<>();
        List<String> titles = new ArrayList<>();
        while (section.find()) {
            bounds.add(new int[] {section.start(), section.end()});
            titles.add(text(section.group(1)));
        }
        for (int i = 0; i < titles.size(); i++) {
            int from = bounds.get(i)[1];
            int to = i + 1 < bounds.size() ? bounds.get(i + 1)[0] : html.length();
            String towards = displayName(titles.get(i));
            List<Arrival> arrivals = new ArrayList<>();
            Matcher row = ROW.matcher(html.substring(from, to));
            while (row.find() && arrivals.size() < MAX_PER_DIRECTION) {
                Integer minutes = minutes(text(row.group(2)));
                if (minutes == null) {
                    continue;
                }
                arrivals.add(new Arrival(minutes, false, displayName(text(row.group(1)))));
            }
            if (!towards.isEmpty()) {
                result.add(new Direction("Retiro".equals(towards) ? 1 : 0, towards, List.copyOf(arrivals)));
            }
        }
        return result;
    }

    /** "8 min" -> 8, "1 h 5 min" -> 65, "llegando" / "en anden" -> 0; null si no se entiende. */
    static Integer minutes(String value) {
        String text = normalize(value);
        if (text.isEmpty()) {
            return null;
        }
        if (text.contains("llegando") || text.contains("anden") || text.contains("arribando")) {
            return 0;
        }
        int total = 0;
        Matcher hours = HOURS.matcher(text);
        if (hours.find()) {
            total += Integer.parseInt(hours.group(1)) * 60;
            text = text.substring(0, hours.start()) + text.substring(hours.end());
        }
        Matcher minutes = MINUTES.matcher(text);
        if (minutes.find()) {
            total += Integer.parseInt(minutes.group(1));
        } else if (total == 0) {
            return null;
        }
        return total;
    }

    /** Nombre de la base si se reconoce; si no, el texto en formato titulo. */
    static String displayName(String label) {
        String known = NAMES.get(normalize(label));
        if (known != null) {
            return known;
        }
        StringBuilder out = new StringBuilder();
        for (String word : label.toLowerCase(Locale.ROOT).split("\\s+")) {
            if (word.isEmpty()) {
                continue;
            }
            if (out.length() > 0) {
                out.append(' ');
            }
            out.append(Character.toUpperCase(word.charAt(0))).append(word.substring(1));
        }
        return out.toString();
    }

    private static String text(String html) {
        return html.replaceAll("<[^>]+>", " ").replace("&nbsp;", " ").replace("&nbsp", " ")
                .replaceAll("\\s+", " ").trim();
    }

    static String normalize(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
    }
}
