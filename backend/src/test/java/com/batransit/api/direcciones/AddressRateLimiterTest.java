package com.batransit.api.direcciones;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class AddressRateLimiterTest {

    /** Reloj que avanza a mano. */
    static class TestClock extends Clock {
        Instant now = Instant.parse("2026-10-31T12:00:00Z");

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
    void frenaALaMismaIpYLaDejaSeguirDespuesDeLaVentana() {
        TestClock clock = new TestClock();
        AddressRateLimiter limiter = new AddressRateLimiter(clock);

        for (int i = 0; i < AddressRateLimiter.MAX_SEARCHES; i++) {
            assertThat(limiter.tryAcquire("1.2.3.4")).isTrue();
        }
        assertThat(limiter.tryAcquire("1.2.3.4")).isFalse();
        assertThat(limiter.tryAcquire("5.6.7.8")).isTrue();

        clock.now = clock.now.plus(AddressRateLimiter.WINDOW).plusSeconds(1);
        assertThat(limiter.tryAcquire("1.2.3.4")).isTrue();
    }
}
