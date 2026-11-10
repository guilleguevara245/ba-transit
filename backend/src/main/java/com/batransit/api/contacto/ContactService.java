package com.batransit.api.contacto;

import com.batransit.api.cuentas.MailSender;
import com.batransit.api.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Formulario de contacto: valida el mensaje y lo manda por mail (Brevo) a
 * la direccion de CONTACT_EMAIL. No se guarda en la base de datos. Nombre,
 * apellido y mail de quien escribe son obligatorios; el mail va como
 * "Responder a": se le contesta respondiendo el mail. Si escribio con la
 * sesion iniciada, van tambien los datos de su cuenta (los del servidor, no
 * los del formulario). Sin Brevo o sin CONTACT_EMAIL, el formulario no esta
 * disponible.
 */
@Service
public class ContactService {

    static final int MIN_LENGTH = 10;
    static final int MAX_LENGTH = 2000;
    static final int MAX_NAME = 80;
    static final int MAX_EMAIL = 254;
    static final int MAX_PAGE = 200;
    static final int MAX_AGENT = 300;
    private static final int SUBJECT_PREVIEW = 60;

    /** Tipos de mensaje: el codigo que manda el sitio y como se lee en el mail. */
    static final Map<String, String> KINDS = Map.of("error", "Error", "idea", "Idea", "otro", "Otro");
    /** Como empieza el asunto de cada tipo ("Error de Ana Perez: ..."). */
    private static final Map<String, String> SUBJECT_KINDS = Map.of("error", "Error", "idea", "Idea", "otro", "Mensaje");

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]{2,}$");
    private static final Pattern PAGE = Pattern.compile("^/[^\\s]*$");
    /** Caracteres de control, salvo el salto de linea y la tabulacion. */
    private static final Pattern CONTROL = Pattern.compile("[\\p{Cc}&&[^\\n\\t]]");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d/M/yyyy")
            .withZone(ZoneId.of("America/Argentina/Buenos_Aires"));

    /** Lo que manda el formulario. website: campo trampa, oculto (si viene con algo, es un bot). */
    public record ContactRequest(String kind, String message, String name, String lastName, String email, String page,
                                 String website) {
    }

    /** Un mensaje ya validado. page puede ser null. */
    public record ContactMessage(String kind, String message, String name, String lastName, String email, String page) {
        String fullName() {
            return name + " " + lastName;
        }
    }

    /** La cuenta de quien escribio, si tenia la sesion iniciada (datos del servidor). */
    public record Account(long id, String email, String name, String lastName, Instant createdAt) {
    }

    private final MailSender mail;
    private final String to;

    public ContactService(MailSender mail, @Value("${app.contact.email:}") String to) {
        this.mail = mail;
        this.to = to == null ? "" : to.strip();
    }

    public boolean isAvailable() {
        return mail.isConfigured() && !to.isEmpty();
    }

    /** true si completaron el campo trampa: se responde como si se hubiera mandado, sin mandar nada. */
    public static boolean isBot(ContactRequest request) {
        return request != null && request.website() != null && !request.website().isBlank();
    }

    /**
     * Valida y limpia el mensaje, en el orden del formulario; BadRequestException
     * con el motivo, listo para mostrar.
     */
    public static ContactMessage validate(ContactRequest request) {
        if (request == null) {
            throw new BadRequestException("Falta el mensaje.");
        }
        String name = oneLine(request.name(), MAX_NAME + 1);
        if (name.isEmpty()) {
            throw new BadRequestException("Escribí tu nombre.");
        }
        String lastName = oneLine(request.lastName(), MAX_NAME + 1);
        if (lastName.isEmpty()) {
            throw new BadRequestException("Escribí tu apellido.");
        }
        if (name.length() > MAX_NAME || lastName.length() > MAX_NAME) {
            throw new BadRequestException("El nombre y el apellido pueden tener hasta " + MAX_NAME + " caracteres.");
        }
        String email = request.email() == null ? "" : request.email().strip();
        if (email.isEmpty()) {
            throw new BadRequestException("Escribí tu mail para que podamos responderte.");
        }
        if (email.length() > MAX_EMAIL || !EMAIL.matcher(email).matches()) {
            throw new BadRequestException("Escribí un mail válido, por ejemplo nombre@gmail.com.");
        }
        String kind = request.kind() == null ? "" : request.kind().strip().toLowerCase();
        if (!KINDS.containsKey(kind)) {
            throw new BadRequestException("Elegí de qué se trata: un error, una idea u otra cosa.");
        }
        String message = clean(request.message());
        if (message.length() < MIN_LENGTH) {
            throw new BadRequestException("Contanos un poco más (al menos " + MIN_LENGTH + " caracteres).");
        }
        if (message.length() > MAX_LENGTH) {
            throw new BadRequestException("El mensaje es muy largo (hasta " + MAX_LENGTH + " caracteres).");
        }
        String page = request.page() == null ? "" : request.page().strip();
        boolean pageOk = page.length() <= MAX_PAGE && PAGE.matcher(page).matches();
        return new ContactMessage(kind, message, name, lastName, email, pageOk ? page : null);
    }

    /**
     * Manda el mensaje. agent: el navegador de quien escribe (ayuda con los
     * errores). account: su cuenta, o null si escribio sin ingresar. true si salio.
     */
    public boolean send(ContactMessage message, String agent, Account account) {
        if (!isAvailable()) {
            return false;
        }
        String browser = agent == null ? null : oneLine(agent, MAX_AGENT);
        return mail.send(to, subject(message), text(message, browser, account), html(message, browser, account),
                message.email());
    }

    static String subject(ContactMessage message) {
        String preview = oneLine(message.message(), SUBJECT_PREVIEW + 1);
        if (preview.length() > SUBJECT_PREVIEW) {
            preview = preview.substring(0, SUBJECT_PREVIEW).strip() + "…";
        }
        return "BA Transit · " + SUBJECT_KINDS.get(message.kind()) + " de " + message.fullName() + ": " + preview;
    }

    static String text(ContactMessage message, String browser, Account account) {
        StringBuilder text = new StringBuilder();
        details(message, browser, account).forEach((label, value) ->
                text.append(label).append(": ").append(value).append('\n'));
        return text.append('\n').append(message.message()).append('\n').toString();
    }

    static String html(ContactMessage message, String browser, Account account) {
        StringBuilder html = new StringBuilder("<table style=\"font:14px sans-serif;color:#555\">");
        details(message, browser, account).forEach((label, value) -> html.append("<tr><td style=\"padding:2px 12px 2px 0\">")
                .append(escape(label)).append("</td><td>").append(escape(value)).append("</td></tr>"));
        return html.append("</table><p style=\"font:15px sans-serif;white-space:pre-wrap\">")
                .append(escape(message.message())).append("</p>").toString();
    }

    /** Los datos que acompanan al mensaje, en orden. */
    private static Map<String, String> details(ContactMessage message, String browser, Account account) {
        Map<String, String> details = new LinkedHashMap<>();
        details.put("Nombre", message.fullName());
        details.put("Mail", message.email());
        details.put("Cuenta", account == null ? "no (escribió sin ingresar)" : describe(account));
        details.put("Tipo", KINDS.get(message.kind()));
        if (message.page() != null) {
            details.put("Página", message.page());
        }
        if (browser != null && !browser.isEmpty()) {
            details.put("Navegador", browser);
        }
        return details;
    }

    /** "N.º 12 · Ana Perez · ana@gmail.com · creada el 3/11/2026". */
    static String describe(Account account) {
        StringBuilder text = new StringBuilder("N.º ").append(account.id());
        String name = ((account.name() == null ? "" : account.name()) + " "
                + (account.lastName() == null ? "" : account.lastName())).strip();
        if (!name.isEmpty()) {
            text.append(" · ").append(name);
        }
        text.append(" · ").append(account.email());
        if (account.createdAt() != null) {
            text.append(" · creada el ").append(DAY.format(account.createdAt()));
        }
        return text.toString();
    }

    /** Sin caracteres de control (salvo saltos de linea y tabulaciones) ni espacios de mas en los bordes. */
    static String clean(String text) {
        if (text == null) {
            return "";
        }
        return CONTROL.matcher(text.replace("\r\n", "\n").replace('\r', '\n')).replaceAll("").strip();
    }

    /** En un renglon y como mucho max caracteres (para el nombre, el asunto y el navegador). */
    static String oneLine(String text, int max) {
        String line = clean(text).replaceAll("\\s+", " ");
        return line.length() > max ? line.substring(0, max) : line;
    }

    static String escape(String text) {
        StringBuilder out = new StringBuilder(text.length());
        for (char c : text.toCharArray()) {
            switch (c) {
                case '&' -> out.append("&amp;");
                case '<' -> out.append("&lt;");
                case '>' -> out.append("&gt;");
                case '"' -> out.append("&quot;");
                case '\'' -> out.append("&#39;");
                default -> out.append(c);
            }
        }
        return out.toString();
    }
}
