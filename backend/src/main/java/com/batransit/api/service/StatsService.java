package com.batransit.api.service;

import com.batransit.api.dto.LineAlertCountRow;
import com.batransit.api.dto.LineAlertStats;
import com.batransit.api.dto.LineTypeCountRow;
import com.batransit.api.repository.AlertRepository;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class StatsService {

    private final AlertRepository alertRepository;

    public StatsService(AlertRepository alertRepository) {
        this.alertRepository = alertRepository;
    }

    public List<LineAlertStats> alertStatsByLine() {
        List<LineAlertCountRow> counts = alertRepository.countByLine();
        List<LineTypeCountRow> typeCounts = alertRepository.countByLineAndType();

        // Para cada linea, nos quedamos con el AlertType que tuvo mas
        // apariciones. Se resuelve en Java, no en SQL, porque un "el
        // valor con el conteo mas alto por grupo" en SQL puro requiere
        // funciones de ventana bastante mas dificiles de leer.
        Map<Long, String> mostCommonTypeByLine = new HashMap<>();
        Map<Long, Long> maxCountByLine = new HashMap<>();

        for (LineTypeCountRow row : typeCounts) {
            Long currentMax = maxCountByLine.getOrDefault(row.lineId(), 0L);
            if (row.count() > currentMax) {
                maxCountByLine.put(row.lineId(), row.count());
                mostCommonTypeByLine.put(row.lineId(), row.type().name());
            }
        }

        return counts.stream()
                .map(c -> new LineAlertStats(
                        c.lineId(),
                        c.lineName(),
                        c.lineColorHex(),
                        c.totalAlerts(),
                        c.activeAlerts(),
                        mostCommonTypeByLine.get(c.lineId())
                ))
                .toList();
    }
}
