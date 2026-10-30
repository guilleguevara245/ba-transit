package com.batransit.api.noticias;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Lee un feed RSS 2.0: de cada nota solo el titulo, el link, la fecha y la
 * fuente (nunca el texto). Las fuentes de Google Noticias traen el medio
 * en <source> y lo repiten al final del titulo ("Titular - Clarín"): se
 * saca del titulo. El XML no puede traer DOCTYPE (evita XXE).
 */
public final class RssParser {

    private RssParser() {
    }

    /** Una nota del feed, sin clasificar. */
    public record RssItem(String title, String link, String source, Instant publishedAt) {
    }

    public static List<RssItem> parse(String xml, String defaultSource) {
        List<RssItem> items = new ArrayList<>();
        if (xml == null || xml.isBlank()) {
            return items;
        }
        Document doc;
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            factory.setExpandEntityReferences(false);
            factory.setNamespaceAware(false);
            DocumentBuilder builder = factory.newDocumentBuilder();
            builder.setErrorHandler(null);
            doc = builder.parse(new ByteArrayInputStream(xml.strip().getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            return items;
        }
        NodeList nodes = doc.getElementsByTagName("item");
        for (int i = 0; i < nodes.getLength(); i++) {
            Element item = (Element) nodes.item(i);
            String title = clean(text(item, "title"));
            String link = clean(text(item, "link"));
            if (title.isEmpty() || !(link.startsWith("https://") || link.startsWith("http://"))) {
                continue;
            }
            String source = clean(text(item, "source"));
            if (source.isEmpty()) {
                source = defaultSource;
            } else if (title.endsWith(" - " + source)) {
                title = title.substring(0, title.length() - source.length() - 3).strip();
            }
            items.add(new RssItem(title, link, source, date(text(item, "pubDate"))));
        }
        return items;
    }

    private static String text(Element parent, String tag) {
        NodeList list = parent.getElementsByTagName(tag);
        return list.getLength() == 0 ? "" : list.item(0).getTextContent();
    }

    /** Sin etiquetas HTML ni entidades sueltas, y con los espacios normales. */
    static String clean(String text) {
        if (text == null) {
            return "";
        }
        return text.replaceAll("<[^>]*>", " ")
                .replace("&nbsp;", " ").replace("&#8220;", "“").replace("&#8221;", "”")
                .replace("&#8216;", "‘").replace("&#8217;", "’").replace("&#8211;", "–").replace("&#8230;", "…")
                .replaceAll("\\s+", " ").strip();
    }

    /** "Thu, 29 Oct 2026 21:30:00 +0000" (RFC 1123); null si no se entiende. */
    static Instant date(String text) {
        String t = text == null ? "" : text.strip();
        if (t.isEmpty()) {
            return null;
        }
        try {
            return ZonedDateTime.parse(t, DateTimeFormatter.RFC_1123_DATE_TIME.withLocale(Locale.ENGLISH)).toInstant();
        } catch (DateTimeParseException e) {
            try {
                return ZonedDateTime.parse(t).toInstant();
            } catch (DateTimeParseException e2) {
                return null;
            }
        }
    }
}
