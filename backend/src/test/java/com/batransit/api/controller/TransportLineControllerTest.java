package com.batransit.api.controller;

import com.batransit.api.domain.TransportMode;
import com.batransit.api.dto.LineResponse;
import com.batransit.api.exception.NotFoundException;
import com.batransit.api.service.TransportLineService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TransportLineController.class)
class TransportLineControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TransportLineService service;

    private final LineResponse lineaA = new LineResponse(1L, TransportMode.SUBTE, "A", "Línea A", "#00A8E1", true);

    @Test
    void listaLasLineas() throws Exception {
        when(service.findAll()).thenReturn(List.of(lineaA));

        mockMvc.perform(get("/api/v1/lines"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].mode").value("SUBTE"))
                .andExpect(jsonPath("$[0].colorHex").value("#00A8E1"));
    }

    @Test
    void filtraPorModoSinDistinguirMayusculas() throws Exception {
        when(service.findByMode(TransportMode.SUBTE)).thenReturn(List.of(lineaA));

        mockMvc.perform(get("/api/v1/lines").param("mode", "subte"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value("A"));
    }

    @Test
    void unModoInvalidoEsUn400ConProblemDetails() throws Exception {
        mockMvc.perform(get("/api/v1/lines").param("mode", "subtee"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void unaLineaInexistenteEsUn404() throws Exception {
        when(service.findById(99L)).thenThrow(new NotFoundException("No existe una línea con id 99"));

        mockMvc.perform(get("/api/v1/lines/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("No existe una línea con id 99"));
    }
}
