package com.batransit.api.service;

import com.batransit.api.domain.Alert;
import com.batransit.api.domain.TransportLine;
import com.batransit.api.dto.AlertRequest;
import com.batransit.api.repository.AlertRepository;
import com.batransit.api.repository.TransportLineRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class AlertService {

    private final AlertRepository alertRepository;
    private final TransportLineRepository transportLineRepository;

    public AlertService(AlertRepository alertRepository, TransportLineRepository transportLineRepository) {
        this.alertRepository = alertRepository;
        this.transportLineRepository = transportLineRepository;
    }

    public List<Alert> findAllActive() {
        return alertRepository.findByActiveTrueOrderByPublishedAtDesc();
    }

    public List<Alert> findActiveByLine(Long lineId) {
        return alertRepository.findByTransportLineIdAndActiveTrueOrderByPublishedAtDesc(lineId);
    }

    public Alert create(AlertRequest request) {
        TransportLine line = transportLineRepository.findById(request.lineId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "No existe una línea con id " + request.lineId()));

        Alert alert = new Alert(line, request.type(), request.description(), request.source());
        return alertRepository.save(alert);
    }
}
