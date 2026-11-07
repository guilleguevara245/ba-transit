package com.batransit.api.estado;

import java.io.IOException;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryUsage;
import java.nio.file.Files;
import java.nio.file.Path;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Deja en el log cuanta memoria usa el servidor: el heap de Java (usado,
 * reservado y maximo), lo que esta fuera del heap (clases, codigo
 * compilado) y lo que el sistema le cuenta al proceso (RSS), que es lo que
 * mira Render para el limite de 512 MB. Cada 10 minutos y en los momentos
 * pesados (por ejemplo, al actualizar los colectivos), asi un reinicio por
 * memoria deja rastro de que estaba creciendo.
 */
@Component
public class MemoryReport {

    private static final Logger log = LoggerFactory.getLogger(MemoryReport.class);
    private static final Path PROC_STATUS = Path.of("/proc/self/status");
    private static final long MB = 1024 * 1024;

    @Scheduled(initialDelay = 60_000, fixedDelay = 600_000)
    public void periodic() {
        log("cada 10 min");
    }

    /** Una linea "Memoria (momento): heap 180/240 MB (max 230), fuera del heap 130 MB, proceso 410 MB". */
    public static void log(String moment) {
        try {
            log.info("Memoria ({}): {}", moment, summary());
        } catch (RuntimeException e) {
            // El reporte nunca puede romper lo que esta midiendo.
            log.debug("Memoria: no se pudo medir ({}).", e.getClass().getSimpleName());
        }
    }

    static String summary() {
        MemoryUsage heap = ManagementFactory.getMemoryMXBean().getHeapMemoryUsage();
        MemoryUsage nonHeap = ManagementFactory.getMemoryMXBean().getNonHeapMemoryUsage();
        Long rssKb = rssKb();
        return String.format("heap %d/%d MB (max %d), fuera del heap %d MB, proceso %s",
                heap.getUsed() / MB, heap.getCommitted() / MB, heap.getMax() / MB, nonHeap.getCommitted() / MB,
                rssKb == null ? "sin dato" : (rssKb / 1024) + " MB");
    }

    /** RSS del proceso en KB, leido de /proc/self/status (solo en Linux). */
    static Long rssKb() {
        try {
            return parseRssKb(Files.readString(PROC_STATUS));
        } catch (IOException | RuntimeException e) {
            return null;
        }
    }

    /** De "VmRSS:   412345 kB" saca 412345; null si no esta. */
    static Long parseRssKb(String status) {
        for (String line : status.split("\n")) {
            if (line.startsWith("VmRSS:")) {
                String digits = line.replaceAll("[^0-9]", "");
                return digits.isEmpty() ? null : Long.parseLong(digits);
            }
        }
        return null;
    }
}
