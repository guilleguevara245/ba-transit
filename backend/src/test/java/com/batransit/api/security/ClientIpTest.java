package com.batransit.api.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

class ClientIpTest {

    private static MockHttpServletRequest request(String cloudflare, String forwarded) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/ingreso");
        request.setRemoteAddr("10.0.0.5");
        if (cloudflare != null) {
            request.addHeader(ClientIp.CLOUDFLARE, cloudflare);
        }
        if (forwarded != null) {
            request.addHeader(ClientIp.FORWARDED, forwarded);
        }
        return request;
    }

    @Test
    void cloudflareGanaAUnaIpInventadaEnXForwardedFor() {
        assertThat(ClientIp.of(request("190.1.2.3", "6.6.6.6, 190.1.2.3, 172.68.1.1"))).isEqualTo("190.1.2.3");
    }

    @Test
    void sinCloudflareSeTomaLaUltimaDeLaCadena() {
        assertThat(ClientIp.of(request(null, "6.6.6.6, 190.1.2.3"))).isEqualTo("190.1.2.3");
        assertThat(ClientIp.of(request(null, "190.1.2.3"))).isEqualTo("190.1.2.3");
    }

    @Test
    void sinCabecerasSeUsaLaConexion() {
        assertThat(ClientIp.of(request(null, null))).isEqualTo("10.0.0.5");
    }

    @Test
    void valoresVaciosOLarguisimosNoSeUsan() {
        assertThat(ClientIp.of(request("x".repeat(200), null))).isEqualTo("10.0.0.5");
        assertThat(ClientIp.of(request("  ", "6.6.6.6,  "))).isEqualTo("10.0.0.5");
    }
}
