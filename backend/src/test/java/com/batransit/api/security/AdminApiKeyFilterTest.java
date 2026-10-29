package com.batransit.api.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class AdminApiKeyFilterTest {

    @Test
    void lasLecturasSonPublicas() throws Exception {
        MockHttpServletResponse response = run(new AdminApiKeyFilter("secreta"), "GET", null);

        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    void escrituraConClaveCorrectaPasa() throws Exception {
        MockHttpServletResponse response = run(new AdminApiKeyFilter("secreta"), "POST", "secreta");

        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    void escrituraSinClaveOConClaveIncorrectaEs401() throws Exception {
        AdminApiKeyFilter filter = new AdminApiKeyFilter("secreta");

        assertThat(run(filter, "POST", null).getStatus()).isEqualTo(401);
        assertThat(run(filter, "POST", "otra").getStatus()).isEqualTo(401);
    }

    @Test
    void sinClaveConfiguradaLaEscrituraQuedaDeshabilitada() throws Exception {
        MockHttpServletResponse response = run(new AdminApiKeyFilter(""), "POST", "");

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentType()).startsWith("application/problem+json");
    }

    @Test
    void lasCuentasDeUsuarioNoLlevanLaClave() throws Exception {
        AdminApiKeyFilter filter = new AdminApiKeyFilter("");
        for (String uri : new String[] {"/api/v1/auth/ingreso", "/api/v1/cuenta/favoritos", "/api/v1/cuenta"}) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", uri);
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, new MockFilterChain());
            assertThat(response.getStatus()).isEqualTo(200);
        }
        // Lo demas sigue protegido.
        assertThat(run(filter, "POST", null).getStatus()).isEqualTo(403);
    }

    private static MockHttpServletResponse run(AdminApiKeyFilter filter, String method, String key) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(method, "/api/v1/alerts");
        if (key != null) {
            request.addHeader(AdminApiKeyFilter.HEADER, key);
        }
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        return response;
    }
}
