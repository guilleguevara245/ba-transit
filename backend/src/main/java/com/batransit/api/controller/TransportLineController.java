package com.batransit.api.controller;

import com.batransit.api.domain.TransportMode;
import com.batransit.api.dto.LineDetailResponse;
import com.batransit.api.dto.LineResponse;
import com.batransit.api.service.TransportLineService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/lines")
public class TransportLineController {

    private final TransportLineService transportLineService;

    public TransportLineController(TransportLineService transportLineService) {
        this.transportLineService = transportLineService;
    }

    /**
     * GET /api/v1/lines devuelve todas las lineas;
     * GET /api/v1/lines?mode=SUBTE filtra por modo.
     */
    @GetMapping
    public List<LineResponse> findAll(@RequestParam(required = false) String mode) {
        if (mode == null || mode.isBlank()) {
            return transportLineService.findAll();
        }
        return transportLineService.findByMode(TransportMode.from(mode));
    }

    @GetMapping("/{id}")
    public LineDetailResponse findById(@PathVariable Long id) {
        return transportLineService.findById(id);
    }
}
