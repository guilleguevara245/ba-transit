package com.batransit.api.contacto;

import com.batransit.api.contacto.ContactRateLimiter.Result;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class ContactRateLimiterTest {

    /** Reloj que avanza a mano. */
    static class TestClock extends Clock {
        Instant now = Instant.parse("2026-11-09T12:00:00Z");

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    @Test
    void frenaALaMismaIpYLaDejaSeguirPasadaLaHora() {
        TestClock clock = new TestClock();
        ContactRateLimiter limiter = new ContactRateLimiter(clock);

        for (int i = 0; i < ContactRateLimiter.MAX_PER_IP; i++) {
            assertThat(limiter.tryAcquire("1.2.3.4")).isEqualTo(Result.OK);
        }
        assertThat(limiter.tryAcquire("1.2.3.4")).isEqualTo(Result.TOO_MANY_FROM_IP);
        // Otra IP no se ve afectada.
        assertThat(limiter.tryAcquire("5.6.7.8")).isEqualTo(Result.OK);

        clock.now = clock.now.plus(ContactRateLimiter.IP_WINDOW).plusSeconds(1);
        assertThat(limiter.tryAcquire("1.2.3.4")).isEqualTo(Result.OK);
    }

    @Test
    void entreTodosHayUnTopePorDia() {
        TestClock clock = new TestClock();
        ContactRateLimiter limiter = new ContactRateLimiter(clock);

        for (int i = 0; i < ContactRateLimiter.MAX_PER_DAY; i++) {
            assertThat(limiter.tryAcquire("10.0.0." + i)).isEqualTo(Result.OK);
        }
        assertThat(limiter.tryAcquire("10.0.1.1")).isEqualTo(Result.TOO_MANY_TODAY);

        clock.now = clock.now.plus(Duration.ofDays(1)).plusSeconds(1);
        assertThat(limiter.tryAcquire("10.0.1.1")).isEqualTo(Result.OK);
    }

    @Test
    void unMensajeFrenadoNoCuenta() {
        TestClock clock = new TestClock();
        ContactRateLimiter limiter = new ContactRateLimiter(clock);
        for (int i = 0; i < ContactRateLimiter.MAX_PER_IP; i++) {
            limiter.tryAcquire("1.2.3.4");
        }
        for (int i = 0; i < 20; i++) {
            assertThat(limiter.tryAcquire("1.2.3.4")).isEqualTo(Result.TOO_MANY_FROM_IP);
        }
        // Los frenados no gastaron el cupo del dia: quedan MAX_PER_DAY - MAX_PER_IP.
        for (int i = 0; i < ContactRateLimiter.MAX_PER_DAY - ContactRateLimiter.MAX_PER_IP; i++) {
            assertThat(limiter.tryAcquire("10.0.0." + i)).isEqualTo(Result.OK);
        }
        assertThat(limiter.tryAcquire("10.0.9.9")).isEqualTo(Result.TOO_MANY_TODAY);
    }
}
