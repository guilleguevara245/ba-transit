package com.batransit.api.controller;

import com.batransit.api.domain.TransportLine;
import com.batransit.api.service.TransportLineService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/lines")
public class TransportLineController {

    private final TransportLineService transportLineService;

    public TransportLineController(TransportLineService transportLineService) {
        this.transportLineService = transportLineService;
    }

    @GetMapping
    public List<TransportLine> findAll() {
        return transportLineService.findAll();
    }

    @GetMapping("/{mode}")
    public List<TransportLine> findByMode(@PathVariable String mode) {
        return transportLineService.findByMode(mode);
    }
}
