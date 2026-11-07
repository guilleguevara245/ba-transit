package com.batransit.api.estado;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class MemoryReportTest {

    @Test
    void leeElRssDelProceso() {
        String status = "Name:\tjava\nVmPeak:\t  900000 kB\nVmRSS:\t  412345 kB\nThreads:\t42\n";
        assertThat(MemoryReport.parseRssKb(status)).isEqualTo(412345L);
        assertThat(MemoryReport.parseRssKb("Name:\tjava\n")).isNull();
    }

    @Test
    void elResumenNombraHeapYProceso() {
        String summary = MemoryReport.summary();
        assertThat(summary.startsWith("heap ")).isTrue();
        assertThat(summary.contains("proceso")).isTrue();
    }
}
