package com.batransit.api.cuentas;

import com.batransit.api.cuentas.AccountModels.SessionResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Recuperar la contrasena: se manda por mail un link de un solo uso que
 * vence en una hora. Al usarlo se pone la contrasena nueva, se anulan los
 * otros links y se cierran las sesiones abiertas en otros dispositivos.
 * Si el mail no tiene cuenta no se avisa (para no revelar quien tiene).
 */
@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    static final Duration VALIDITY = Duration.ofHours(1);
    /** Como mucho tantos links por cuenta por hora (aunque cambie la IP). */
    static final int MAX_PER_HOUR = 3;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final AppUserRepository users;
    private final PasswordResetRepository resets;
    private final AccountService accounts;
    private final MailSender mail;
    private final String siteUrl;
    private final Clock clock;

    @Autowired
    public PasswordResetService(AppUserRepository users, PasswordResetRepository resets, AccountService accounts,
                                MailSender mail, @Value("${app.site-url:https://ba-transit.onrender.com}") String siteUrl) {
        this(users, resets, accounts, mail, siteUrl, Clock.systemUTC());
    }

    PasswordResetService(AppUserRepository users, PasswordResetRepository resets, AccountService accounts,
                         MailSender mail, String siteUrl, Clock clock) {
        this.users = users;
        this.resets = resets;
        this.accounts = accounts;
        this.mail = mail;
        this.siteUrl = siteUrl.replaceAll("/+$", "");
        this.clock = clock;
    }

    public boolean isAvailable() {
        return mail.isConfigured();
    }

    /** Manda el link si hay una cuenta con ese mail. Responde igual en los dos casos. */
    @Transactional
    public void request(String rawEmail) {
        if (!isAvailable()) {
            throw new AccountException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Recuperar la contraseña no está disponible por el momento.");
        }
        String email = AccountService.normalizeEmail(rawEmail);
        AppUser user = users.findByEmail(email).orElse(null);
        if (user == null) {
            return;
        }
        Instant now = clock.instant();
        if (resets.countByUserIdAndCreatedAtAfter(user.getId(), now.minus(Duration.ofHours(1))) >= MAX_PER_HOUR) {
            return; // ya se mandaron varios hace poco: no se manda otro (y no se avisa)
        }
        byte[] raw = new byte[32];
        RANDOM.nextBytes(raw);
        String code = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        resets.save(new PasswordReset(user.getId(), sha256(code), now, now.plus(VALIDITY)));

        String link = siteUrl + "/restablecer?codigo=" + code;
        boolean sent = mail.send(user.getEmail(), "Recuperá tu contraseña de BA Transit", text(link), html(link));
        if (!sent) {
            log.warn("No se pudo mandar el mail de recuperacion");
        }
    }

    /** Pone la contrasena nueva con el codigo del link y deja la sesion iniciada. */
    @Transactional
    public SessionResponse reset(String code, String newPassword) {
        AccountService.checkPassword(newPassword);
        Instant now = clock.instant();
        PasswordReset reset = code == null ? null : resets.findByTokenHash(sha256(code.strip())).orElse(null);
        if (reset == null || reset.getUsedAt() != null || !reset.getExpiresAt().isAfter(now)) {
            throw new AccountException(HttpStatus.BAD_REQUEST,
                    "El link venció o ya se usó. Pedí uno nuevo desde \"¿Olvidaste tu contraseña?\".");
        }
        AppUser user = users.findById(reset.getUserId()).orElseThrow(() -> new AccountException(HttpStatus.BAD_REQUEST,
                "El link venció o ya se usó. Pedí uno nuevo desde \"¿Olvidaste tu contraseña?\"."));
        user.setPasswordHash(PasswordHasher.hash(newPassword));
        // Cierra las sesiones de otros dispositivos (la nueva se emite en este mismo segundo o despues).
        user.setSessionsValidAfter(now.truncatedTo(ChronoUnit.SECONDS));
        user.setLastLoginAt(now);
        for (PasswordReset other : resets.findByUserIdAndUsedAtIsNull(user.getId())) {
            other.setUsedAt(now);
        }
        reset.setUsedAt(now);
        accounts.endAllSessions(user.getId());
        return accounts.session(user);
    }

    static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String text(String link) {
        return "Hola:\n\nPediste recuperar tu contraseña de BA Transit. Para elegir una nueva, abrí este link "
                + "(vale por una hora y se puede usar una sola vez):\n\n" + link + "\n\n"
                + "Si no lo pediste vos, ignorá este mail: tu contraseña no cambia.\n\nBA Transit";
    }

    private static String html(String link) {
        String safe = link.replace("&", "&amp;").replace("\"", "&quot;").replace("<", "&lt;");
        return "<div style=\"font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#17171a;max-width:480px\">"
                + "<div style=\"background:#17171a;color:#f4c11b;font-weight:bold;font-size:20px;padding:14px 18px;"
                + "letter-spacing:1px\">BA TRANSIT</div>"
                + "<div style=\"border:1px solid #e2dfd6;border-top:4px solid #f4c11b;padding:18px\">"
                + "<p style=\"margin:0 0 12px\">Pediste recuperar tu contraseña de BA Transit.</p>"
                + "<p style=\"margin:0 0 18px\"><a href=\"" + safe + "\" style=\"display:inline-block;background:#f4c11b;"
                + "color:#17171a;font-weight:bold;text-decoration:none;padding:11px 18px\">Elegir una contraseña nueva</a></p>"
                + "<p style=\"margin:0 0 12px;font-size:13px;color:#5c5a54\">El link vale por una hora y se puede usar una "
                + "sola vez. Si no lo pediste vos, ignorá este mail: tu contraseña no cambia.</p>"
                + "<p style=\"margin:0;font-size:12px;color:#8f8c83;word-break:break-all\">" + safe + "</p>"
                + "</div></div>";
    }
}
