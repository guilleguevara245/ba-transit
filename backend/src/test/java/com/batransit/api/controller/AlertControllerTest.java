package com.batransit.api.controller;

import com.batransit.api.domain.AlertType;
import com.batransit.api.dto.AlertResponse;
import com.batransit.api.security.AdminApiKeyFilter;
import com.batransit.api.service.AlertService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(value = AlertController.class, properties = "app.admin-api-key=clave-de-test")
class AlertControllerTest {

    private static final String VALID_BODY =
            "{\"lineId\": 1, \"type\": \"DEMORA\", \"description\": \"Demoras\", \"source\": \"Manual\"}";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AlertService service;

    private final AlertResponse alert = new AlertResponse(
            10L, 1L, AlertType.DEMORA, "Demoras", "Manual", true, Instant.parse("2026-10-01T12:00:00Z"));

    @Test
    void listarAlertasEsPublico() throws Exception {
        when(service.findAllActive()).thenReturn(List.of(alert));

        mockMvc.perform(get("/api/v1/alerts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].transportLineId").value(1))
                .andExpect(jsonPath("$[0].type").value("DEMORA"));
    }

    @Test
    void crearSinApiKeyEsUn401() throws Exception {
        mockMvc.perform(post("/api/v1/alerts").contentType(MediaType.APPLICATION_JSON).content(VALID_BODY))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void crearConApiKeyEsUn201() throws Exception {
        when(service.create(any())).thenReturn(alert);

        mockMvc.perform(post("/api/v1/alerts")
                        .header(AdminApiKeyFilter.HEADER, "clave-de-test")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10));
    }

    @Test
    void datosInvalidosDevuelvenElCampoQueFallo() throws Exception {
        mockMvc.perform(post("/api/v1/alerts")
                        .header(AdminApiKeyFilter.HEADER, "clave-de-test")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\": \"DEMORA\", \"description\": \"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.lineId").exists())
                .andExpect(jsonPath("$.errors.description").exists());
    }
}
