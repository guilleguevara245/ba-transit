package com.batransit.api.direcciones;

import com.batransit.api.direcciones.AddressService.Address;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AddressServiceTest {

    /** Respuestas reales de Georef (30/10/2026), grabadas. */
    static String sample(String name) throws IOException {
        try (InputStream in = AddressServiceTest.class.getResourceAsStream("/direcciones/" + name)) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    static class FakeService extends AddressService {
        final List<String> urls = new ArrayList<>();
        String response;

        FakeService(String response) {
            super("https://apis.datos.gob.ar/georef/api/direcciones", new ObjectMapper());
            this.response = response;
        }

        @Override
        protected String fetch(String url) {
            urls.add(url);
            if (response == null) {
                throw new IllegalStateException("caido");
            }
            return response;
        }
    }

    @Test
    void sinRepetidosYSoloDelAmba() throws IOException {
        List<Address> origone = AddressService.parse(new ObjectMapper().readTree(sample("origone-151.json")));
        // Georef devuelve un resultado por tramo: quedan uno por partido.
        assertThat(origone.size()).isEqualTo(3);
        assertThat(origone.get(0).text()).isEqualTo("Tte Origone 151");
        assertThat(origone.get(0).area()).isEqualTo("Hurlingham");
        // Corrientes 1234: Rosario y General Alvarado quedan afuera (no son del AMBA).
        List<Address> corrientes = AddressService.parse(new ObjectMapper().readTree(sample("corrientes-1234.json")));
        assertThat(corrientes.size()).isEqualTo(1);
        assertThat(corrientes.get(0).area()).isEqualTo("Ciudad de Buenos Aires");
        // Sin el codigo de calle del principio.
        List<Address> peron = AddressService.parse(new ObjectMapper().readTree(sample("peron-1500-san-miguel.json")));
        assertThat(peron.get(0).text()).isEqualTo("Pres Juan D Peron 1500");
        assertThat(peron.get(0).area()).isEqualTo("San Miguel");
    }

    @Test
    void unaConsultaPorBusquedaYLasCortasNiSeConsultan() throws IOException {
        FakeService service = new FakeService(sample("origone-151.json"));
        assertThat(service.search("Origone 151").orElseThrow().size()).isEqualTo(3);
        assertThat(service.search("  origone   151 ").orElseThrow().size()).isEqualTo(3);
        assertThat(service.urls.size()).isEqualTo(1);
        assertThat(service.search("ab").orElseThrow().isEmpty()).isEqualTo(true);
        assertThat(service.urls.size()).isEqualTo(1);
        // Si Georef no responde: vacio (el controlador responde 503).
        service.response = null;
        assertThat(service.search("Corrientes 1234").isPresent()).isEqualTo(false);
    }
}
