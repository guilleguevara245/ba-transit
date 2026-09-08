package com.batransit.api.controller;

import com.batransit.api.domain.Fare;
import com.batransit.api.dto.FareRequest;
import com.batransit.api.service.FareService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/fares")
public class FareController {

    private final FareService fareService;

    public FareController(FareService fareService) {
        this.fareService = fareService;
    }

    @GetMapping
    public List<Fare> findAllActive() {
        return fareService.findAllActive();
    }

    @GetMapping("/{mode}")
    public List<Fare> findByMode(@PathVariable String mode) {
        return fareService.findActiveByMode(mode);
    }

    @PostMapping
    public ResponseEntity<Fare> create(@Valid @RequestBody FareRequest request) {
        Fare created = fareService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
