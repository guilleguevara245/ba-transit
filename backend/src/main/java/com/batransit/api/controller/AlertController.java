package com.batransit.api.controller;

import com.batransit.api.domain.Alert;
import com.batransit.api.dto.AlertRequest;
import com.batransit.api.service.AlertService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/alerts")
public class AlertController {

    private final AlertService alertService;

    public AlertController(AlertService alertService) {
        this.alertService = alertService;
    }

    @GetMapping
    public List<Alert> findAllActive() {
        return alertService.findAllActive();
    }

    @PostMapping
    public ResponseEntity<Alert> create(@Valid @RequestBody AlertRequest request) {
        Alert created = alertService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
