package com.batransit.api.contacto;

import com.batransit.api.contacto.ContactService.Account;
import com.batransit.api.contacto.ContactService.ContactMessage;
import com.batransit.api.contacto.ContactService.ContactRequest;
import com.batransit.api.cuentas.MailSender;
import com.batransit.api.exception.BadRequestException;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ContactServiceTest {

    /** Mail falso: guarda lo que se "mando" (destino, asunto, texto, html, responder a). */
    static class FakeMail extends MailSender {
        final List<String[]> sent = new ArrayList<>();
        boolean configured = true;
        boolean works = true;

        FakeMail() {
            super("clave", "bot@batransit.test", "BA Transit");
        }

        @Override
        public boolean isConfigured() {
            return configured;
        }

        @Override
        public boolean send(String to, String subject, String text, String html, String replyTo) {
            sent.add(new String[] {to, subject, text, html, replyTo});
            return works;
        }
    }

    /** Un pedido completo: nombre, apellido y mail de prueba. */
    static ContactRequest request(String kind, String message) {
        return new ContactRequest(kind, message, "Ana", "Pérez", "ana@gmail.com", "/mapa", null);
    }

    private static ContactRequest withPerson(String name, String lastName, String email) {
        return new ContactRequest("idea", "Sumar los horarios del Tren de la Costa", name, lastName, email, "/", null);
    }

    @Test
    void sinMailDeDestinoOSinBrevoNoEstaDisponible() {
        FakeMail mail = new FakeMail();
        assertThat(new ContactService(mail, "yo@ejemplo.com").isAvailable()).isTrue();
        assertThat(new ContactService(mail, " ").isAvailable()).isFalse();
        mail.configured = false;
        assertThat(new ContactService(mail, "yo@ejemplo.com").isAvailable()).isFalse();
    }

    @Test
    void mandaElMensajeConQuienEscribioYResponderASuMail() {
        FakeMail mail = new FakeMail();
        ContactService service = new ContactService(mail, "yo@ejemplo.com");
        ContactMessage message = ContactService.validate(new ContactRequest("error",
                "  El mapa no carga\r\nen la línea B  ", "  Ana ", " Pérez  ", " ana@gmail.com ", "/mapa", null));

        assertThat(service.send(message, "Mozilla/5.0 (Windows NT 10.0)", null)).isTrue();

        String[] sent = mail.sent.get(0);
        assertThat(sent[0]).isEqualTo("yo@ejemplo.com");
        assertThat(sent[1]).isEqualTo("BA Transit · Error de Ana Pérez: El mapa no carga en la línea B");
        assertThat(sent[2]).contains("Nombre: Ana Pérez");
        assertThat(sent[2]).contains("Mail: ana@gmail.com");
        assertThat(sent[2]).contains("Cuenta: no (escribió sin ingresar)");
        assertThat(sent[2]).contains("Tipo: Error");
        assertThat(sent[2]).contains("Página: /mapa");
        assertThat(sent[2]).contains("Navegador: Mozilla/5.0 (Windows NT 10.0)");
        assertThat(sent[2]).contains("El mapa no carga\nen la línea B");
        assertThat(sent[4]).isEqualTo("ana@gmail.com");
    }

    @Test
    void conLaSesionIniciadaVanLosDatosDeLaCuenta() {
        FakeMail mail = new FakeMail();
        Account account = new Account(12, "ana.perez@gmail.com", "Ana", "Pérez", Instant.parse("2026-11-03T15:00:00Z"));
        new ContactService(mail, "yo@ejemplo.com").send(ContactService.validate(request("idea", "Sumar el Tren de la Costa")),
                null, account);

        assertThat(mail.sent.get(0)[2]).contains("Cuenta: N.º 12 · Ana Pérez · ana.perez@gmail.com · creada el 3/11/2026");
        assertThat(mail.sent.get(0)[1]).isEqualTo("BA Transit · Idea de Ana Pérez: Sumar el Tren de la Costa");
    }

    @Test
    void unaCuentaSinNombreNiFechaSeDescribeIgual() {
        assertThat(ContactService.describe(new Account(7, "x@y.com", null, " ", null))).isEqualTo("N.º 7 · x@y.com");
    }

    @Test
    void nombreApellidoYMailSonObligatorios() {
        assertThatThrownBy(() -> ContactService.validate(withPerson(" ", "Pérez", "ana@gmail.com")))
                .hasMessageContaining("tu nombre");
        assertThatThrownBy(() -> ContactService.validate(withPerson("Ana", null, "ana@gmail.com")))
                .hasMessageContaining("tu apellido");
        assertThatThrownBy(() -> ContactService.validate(withPerson("Ana", "Pérez", "")))
                .hasMessageContaining("tu mail");
        assertThatThrownBy(() -> ContactService.validate(withPerson("Ana", "Pérez", "ana@")))
                .hasMessageContaining("mail válido");
        assertThatThrownBy(() -> ContactService.validate(withPerson("A".repeat(ContactService.MAX_NAME + 1), "Pérez", "ana@gmail.com")))
                .hasMessageContaining("hasta");
    }

    @Test
    void elNombreVaEnUnRenglon() {
        ContactMessage message = ContactService.validate(withPerson("Ana\nMaría", "Pérez\tGómez", "ana@gmail.com"));
        assertThat(message.fullName()).isEqualTo("Ana María Pérez Gómez");
    }

    @Test
    void elHtmlNoDejaPasarEtiquetas() {
        FakeMail mail = new FakeMail();
        new ContactService(mail, "yo@ejemplo.com").send(ContactService.validate(new ContactRequest("otro",
                "<script>alert('hola')</script> & más", "<b>Ana</b>", "Pérez", "ana@gmail.com", null, null)), null, null);

        String html = mail.sent.get(0)[3];
        assertThat(html).contains("&lt;script&gt;alert(&#39;hola&#39;)&lt;/script&gt; &amp; más");
        assertThat(html).contains("&lt;b&gt;Ana&lt;/b&gt; Pérez");
        assertThat(html.contains("<script>")).isFalse();
        assertThat(html.contains("<b>")).isFalse();
    }

    @Test
    void elAsuntoVaEnUnRenglonYCortado() {
        String largo = "Uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce";
        ContactMessage message = ContactService.validate(request("otro", "Primera línea\n" + largo));
        String subject = ContactService.subject(message);

        assertThat(subject.startsWith("BA Transit · Mensaje de Ana Pérez: Primera línea Uno")).isTrue();
        assertThat(subject.contains("\n")).isFalse();
        assertThat(subject.endsWith("…")).isTrue();
    }

    @Test
    void rechazaLoQueNoSirveConUnMotivoParaMostrar() {
        assertThatThrownBy(() -> ContactService.validate(null)).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> ContactService.validate(request("queja", "Un mensaje que alcanza")))
                .hasMessageContaining("de qué se trata");
        assertThatThrownBy(() -> ContactService.validate(request("error", "  corto  ")))
                .hasMessageContaining("al menos");
        assertThatThrownBy(() -> ContactService.validate(request("error", "x".repeat(ContactService.MAX_LENGTH + 1))))
                .hasMessageContaining("muy largo");
    }

    @Test
    void limpiaCaracteresDeControlYDescartaUnaPaginaRara() {
        ContactMessage message = ContactService.validate(new ContactRequest("ERROR", "Hola\u0000 mundo\u0007, falla algo",
                "Ana", "Pérez", "ana@gmail.com", "https://otro.sitio/x", null));

        assertThat(message.kind()).isEqualTo("error");
        assertThat(message.message()).isEqualTo("Hola mundo, falla algo");
        assertThat(message.page()).isNull();
    }

    @Test
    void elCampoTrampaDelataAUnBot() {
        assertThat(ContactService.isBot(new ContactRequest("idea", "Hola", "B", "B", "b@b.com", null, "http://spam"))).isTrue();
        assertThat(ContactService.isBot(new ContactRequest("idea", "Hola", "A", "P", "a@p.com", null, ""))).isFalse();
        assertThat(ContactService.isBot(null)).isFalse();
    }

    @Test
    void siBrevoFallaAvisa() {
        FakeMail mail = new FakeMail();
        mail.works = false;
        ContactService service = new ContactService(mail, "yo@ejemplo.com");

        assertThat(service.send(ContactService.validate(request("error", "No anda el buscador")), null, null)).isFalse();
    }
}
