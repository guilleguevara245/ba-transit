package com.batransit.api.service;

import com.batransit.api.domain.Alert;
import com.batransit.api.domain.TransportLine;
import com.batransit.api.dto.AlertRequest;
import com.batransit.api.dto.AlertResponse;
import com.batransit.api.exception.NotFoundException;
import com.batransit.api.repository.AlertRepository;
import com.batransit.api.repository.TransportLineRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AlertService {

    private final AlertRepository alertRepository;
    private final TransportLineRepository transportLineRepository;

    public AlertService(AlertRepository alertRepository, TransportLineRepository transportLineRepository) {
        this.alertRepository = alertRepository;
        this.transportLineRepository = transportLineRepository;
    }

    public List<AlertResponse> findAllActive() {
        return alertRepository.findByActiveTrueOrderByPublishedAtDesc().stream()
                .map(AlertResponse::from)
                .toList();
    }

    public List<AlertResponse> findActiveByLine(Long lineId) {
        return alertRepository.findByTransportLineIdAndActiveTrueOrderByPublishedAtDesc(lineId).stream()
                .map(AlertResponse::from)
                .toList();
    }

    public AlertResponse create(AlertRequest request) {
        TransportLine line = transportLineRepository.findById(request.lineId())
                .orElseThrow(() -> new NotFoundException("No existe una línea con id " + request.lineId()));

        Alert alert = new Alert(line, request.type(), request.description(), request.source());
        return AlertResponse.from(alertRepository.save(alert));
    }
}
