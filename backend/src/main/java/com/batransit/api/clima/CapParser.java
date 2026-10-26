package com.batransit.api.clima;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.StringReader;
import java.text.Normalizer;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Lee el feed de alertas del Servicio Meteorologico Nacional en formato
 * CAP (Common Alerting Protocol, el estandar de la OMM): un indice RSS
 * con un enlace por alerta y un documento XML CAP por cada una.
 *
 * El color de la alerta (amarilla, naranja, roja) no tiene un campo fijo
 * en CAP: se busca en los parametros y en los textos, y si no aparece se
 * deduce de la gravedad (severity).
 */
public final class CapParser {

    /** Alerta de un documento CAP, con lo que se usa en el sitio. */
    public record CapAlert(String identifier, String msgType, List<String> references, String event,
                           String headline, String description, String instruction, String severity,
                           String level, String kind, OffsetDateTime onset, OffsetDateTime expires,
                           List<String> areas, List<List<double[]>> polygons) {
    }

    private CapParser() {
    }

    /** Enlaces a documentos CAP dentro de una pagina HTML (href="...xml"). */
    private static final Pattern HTML_XML_LINK = Pattern.compile("href=[\"']([^\"']+\\.xml)[\"']",
            Pattern.CASE_INSENSITIVE);

    /**
     * Enlaces del indice. El SMN hoy lo sirve como pagina HTML (una tarjeta
     * por alerta con un boton "Ver XML CAP"); tambien se acepta RSS
     * (item/link) o Atom (entry/link@href) por si cambia.
     */
    public static List<String> parseIndex(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        String trimmed = text.strip();
        if (trimmed.regionMatches(true, 0, "<!doctype html", 0, 14) || trimmed.regionMatches(true, 0, "<html", 0, 5)) {
            return htmlLinks(trimmed);
        }
        try {
            List<String> links = feedLinks(parse(trimmed));
            return links.isEmpty() ? htmlLinks(trimmed) : links;
        } catch (IllegalArgumentException e) {
            return htmlLinks(trimmed);
        }
    }

    private static List<String> htmlLinks(String html) {
        Set<String> links = new LinkedHashSet<>();
        Matcher matcher = HTML_XML_LINK.matcher(html);
        while (matcher.find()) {
            links.add(matcher.group(1).replace("&amp;", "&").trim());
        }
        return List.copyOf(links);
    }

    private static List<String> feedLinks(Document doc) {
        Set<String> links = new LinkedHashSet<>();
        for (Element item : elements(doc.getDocumentElement(), "item")) {
            String link = text(item, "link");
            if (!link.isEmpty()) {
                links.add(link);
            }
        }
        for (Element entry : elements(doc.getDocumentElement(), "entry")) {
            for (Element link : elements(entry, "link")) {
                String href = link.getAttribute("href").trim();
                if (!href.isEmpty()) {
                    links.add(href);
                }
            }
        }
        return List.copyOf(links);
    }

    /** Alerta de un documento CAP; vacio si no es un CAP valido. */
    public static Optional<CapAlert> parseAlert(String xml) {
        Document doc;
        try {
            doc = parse(xml);
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
        Element root = doc.getDocumentElement();
        if (!"alert".equals(localName(root))) {
            return Optional.empty();
        }
        List<Element> infos = elements(root, "info");
        if (infos.isEmpty()) {
            return Optional.empty();
        }
        // Si hay varios <info> (idiomas), se prefiere el de castellano.
        Element info = infos.stream()
                .filter(i -> text(i, "language").toLowerCase(Locale.ROOT).startsWith("es"))
                .findFirst().orElse(infos.get(0));

        List<String> references = new ArrayList<>();
        // <references>: "remitente,identificador,fecha" separados por espacios.
        for (String ref : text(root, "references").split("\\s+")) {
            String[] parts = ref.split(",");
            if (parts.length >= 2) {
                references.add(parts[1]);
            }
        }

        List<String> areas = new ArrayList<>();
        List<List<double[]>> polygons = new ArrayList<>();
        for (Element area : elements(info, "area")) {
            String desc = text(area, "areaDesc");
            if (!desc.isEmpty()) {
                areas.add(desc);
            }
            for (Element polygon : elements(area, "polygon")) {
                List<double[]> points = parsePolygon(polygon.getTextContent());
                if (points.size() >= 3) {
                    polygons.add(points);
                }
            }
        }

        StringBuilder parameters = new StringBuilder();
        for (Element parameter : elements(info, "parameter")) {
            parameters.append(text(parameter, "valueName")).append(' ').append(text(parameter, "value")).append(' ');
        }

        String event = text(info, "event");
        String headline = text(info, "headline");
        String description = text(info, "description");
        String severity = text(info, "severity");
        // Primero los parametros y el titulo; la descripcion solo si ahi no dice el color.
        String level = Optional.ofNullable(detectLevel(parameters + " " + headline + " " + event, null))
                .orElseGet(() -> detectLevel(description, severity));
        OffsetDateTime onset = parseDate(text(info, "onset")).or(() -> parseDate(text(info, "effective")))
                .orElse(parseDate(text(root, "sent")).orElse(null));
        OffsetDateTime expires = parseDate(text(info, "expires")).orElse(null);

        return Optional.of(new CapAlert(text(root, "identifier"), text(root, "msgType"), references, event,
                headline, description, text(info, "instruction"), severity, level,
                detectKind(event + " " + headline), onset, expires, areas, polygons));
    }

    /** AMARILLA, NARANJA o ROJA; null si no llega a alerta (gravedad menor o desconocida). */
    static String detectLevel(String text, String severity) {
        String t = normalize(text);
        if (t.matches(".*\\broj[oa]s?\\b.*")) {
            return "ROJA";
        }
        if (t.matches(".*\\bnaranjas?\\b.*")) {
            return "NARANJA";
        }
        if (t.matches(".*\\bamarill[oa]s?\\b.*")) {
            return "AMARILLA";
        }
        return switch (severity == null ? "" : severity.trim()) {
            case "Extreme" -> "ROJA";
            case "Severe" -> "NARANJA";
            case "Moderate" -> "AMARILLA";
            default -> null;
        };
    }

    /** Tipo de fenomeno a partir del evento y el titulo. */
    static String detectKind(String text) {
        String t = normalize(text);
        if (t.contains("tormenta")) {
            return "TORMENTAS";
        }
        if (t.contains("lluvia") || t.contains("precipitacion")) {
            return "LLUVIAS";
        }
        if (t.contains("calor") || t.contains("temperaturas extremas") || t.contains("altas temperaturas")) {
            return "CALOR";
        }
        if (t.contains("viento") || t.contains("zonda")) {
            return "VIENTO";
        }
        if (t.contains("nieve") || t.contains("nevada")) {
            return "NEVADAS";
        }
        if (t.contains("frio") || t.contains("bajas temperaturas")) {
            return "FRIO";
        }
        return "OTRO";
    }

    /** "lat,lon lat,lon ..." (formato CAP). */
    static List<double[]> parsePolygon(String text) {
        List<double[]> points = new ArrayList<>();
        for (String pair : text.trim().split("\\s+")) {
            String[] parts = pair.split(",");
            if (parts.length == 2) {
                try {
                    points.add(new double[] {Double.parseDouble(parts[0]), Double.parseDouble(parts[1])});
                } catch (NumberFormatException ignored) {
                    // Punto mal formado: se saltea.
                }
            }
        }
        return points;
    }

    /** Si el punto (lat, lon) cae dentro del poligono (ray casting). */
    public static boolean contains(List<double[]> polygon, double lat, double lon) {
        boolean inside = false;
        for (int i = 0, j = polygon.size() - 1; i < polygon.size(); j = i++) {
            double yi = polygon.get(i)[0];
            double xi = polygon.get(i)[1];
            double yj = polygon.get(j)[0];
            double xj = polygon.get(j)[1];
            if ((yi > lat) != (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) {
                inside = !inside;
            }
        }
        return inside;
    }

    static String normalize(String text) {
        return Normalizer.normalize(text == null ? "" : text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
    }

    private static Optional<OffsetDateTime> parseDate(String text) {
        if (text == null || text.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(OffsetDateTime.parse(text.trim()));
        } catch (DateTimeParseException e) {
            return Optional.empty();
        }
    }

    private static Document parse(String xml) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(true);
            // Sin entidades externas ni DTD (XXE): el XML viene de afuera.
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            factory.setExpandEntityReferences(false);
            DocumentBuilder builder = factory.newDocumentBuilder();
            builder.setErrorHandler(null);
            return builder.parse(new InputSource(new StringReader(xml.strip())));
        } catch (Exception e) {
            throw new IllegalArgumentException("XML invalido", e);
        }
    }

    private static String localName(Node node) {
        return node.getLocalName() != null ? node.getLocalName() : node.getNodeName();
    }

    /** Descendientes con ese nombre local, en cualquier espacio de nombres. */
    private static List<Element> elements(Element parent, String name) {
        List<Element> result = new ArrayList<>();
        NodeList list = parent.getElementsByTagNameNS("*", name);
        for (int i = 0; i < list.getLength(); i++) {
            result.add((Element) list.item(i));
        }
        if (result.isEmpty()) {
            NodeList plain = parent.getElementsByTagName(name);
            for (int i = 0; i < plain.getLength(); i++) {
                result.add((Element) plain.item(i));
            }
        }
        return result;
    }

    /** Texto del primer descendiente con ese nombre, o "". */
    private static String text(Element parent, String name) {
        List<Element> list = elements(parent, name);
        return list.isEmpty() ? "" : list.get(0).getTextContent().trim();
    }
}
