package com.batransit.api.estado;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CityApiProbeTest {

    @Test
    void vacioNoCuentaComoDatos() {
        assertFalse(CityApiProbe.hasData(""));
        assertFalse(CityApiProbe.hasData(" [] "));
        assertFalse(CityApiProbe.hasData("{}"));
        assertFalse(CityApiProbe.hasData("{\"list\": [ ]}"));
        assertTrue(CityApiProbe.hasData("[{\"hora\":\"2026-10-26T10:00Z\",\"cantidad\":90}]"));
        assertTrue(CityApiProbe.hasData("{\"list\":[{\"code\":\"3278\"}]}"));
    }
}
