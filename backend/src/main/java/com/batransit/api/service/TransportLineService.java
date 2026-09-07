package com.batransit.api.service;

import com.batransit.api.domain.TransportLine;
import com.batransit.api.repository.TransportLineRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TransportLineService {

    private final TransportLineRepository transportLineRepository;

    public TransportLineService(TransportLineRepository transportLineRepository) {
        this.transportLineRepository = transportLineRepository;
    }

    public List<TransportLine> findAll() {
        return transportLineRepository.findAll();
    }

    public List<TransportLine> findByMode(String mode) {
        return transportLineRepository.findByModeIgnoreCaseOrderByCodeAsc(mode);
    }
}
