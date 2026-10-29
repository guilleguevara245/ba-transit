package com.batransit.api.notificaciones;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class QuietHoursTest {

    private static PushSubscription with(Integer from, Integer to) {
        PushSubscription s = new PushSubscription("https://fcm.googleapis.com/x", "k", "a");
        s.update("k", "a", null, "{}", "lineas", true, from == null ? null : from.shortValue(),
                to == null ? null : to.shortValue(), Instant.now());
        return s;
    }

    /** Hora de Buenos Aires = UTC - 3. */
    private static Instant ba(String isoLocal) {
        return Instant.parse(isoLocal + "Z").plusSeconds(3 * 3600);
    }

    @Test
    void deNocheCruzandoLaMedianoche() {
        PushSubscription s = with(23, 7);
        assertThat(NotificationService.inQuietHours(s, ba("2026-10-29T23:30:00"))).isEqualTo(true);
        assertThat(NotificationService.inQuietHours(s, ba("2026-10-30T03:00:00"))).isEqualTo(true);
        assertThat(NotificationService.inQuietHours(s, ba("2026-10-30T07:00:00"))).isEqualTo(false);
        assertThat(NotificationService.inQuietHours(s, ba("2026-10-30T12:00:00"))).isEqualTo(false);
    }

    @Test
    void dentroDelDiaYSinPausa() {
        assertThat(NotificationService.inQuietHours(with(13, 15), ba("2026-10-30T14:10:00"))).isEqualTo(true);
        assertThat(NotificationService.inQuietHours(with(13, 15), ba("2026-10-30T15:10:00"))).isEqualTo(false);
        assertThat(NotificationService.inQuietHours(with(null, null), ba("2026-10-30T03:00:00"))).isEqualTo(false);
    }
}
