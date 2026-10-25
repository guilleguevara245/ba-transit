package com.batransit.api.service;

import com.batransit.api.domain.TransportMode;
import com.batransit.api.dto.LineDetailResponse;
import com.batransit.api.dto.LineResponse;
import com.batransit.api.exception.NotFoundException;
import com.batransit.api.repository.TransportLineRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TransportLineService {

    private final TransportLineRepository transportLineRepository;

    public TransportLineService(TransportLineRepository transportLineRepository) {
        this.transportLineRepository = transportLineRepository;
    }

    public List<LineResponse> findAll() {
        return transportLineRepository.findAll(Sort.by("mode", "code")).stream()
                .map(LineResponse::from)
                .toList();
    }

    public LineDetailResponse findById(Long id) {
        return transportLineRepository.findById(id)
                .map(LineDetailResponse::from)
                .orElseThrow(() -> new NotFoundException("No existe una línea con id " + id));
    }

    public List<LineResponse> findByMode(TransportMode mode) {
        return transportLineRepository.findByModeOrderByCodeAsc(mode).stream()
                .map(LineResponse::from)
                .toList();
    }
}
