package com.batransit.api.controller;

import com.batransit.api.dto.AlertResponse;
import com.batransit.api.service.AlertService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/lines/{lineId}/alerts")
public class LineAlertController {

    private final AlertService alertService;

    public LineAlertController(AlertService alertService) {
        this.alertService = alertService;
    }

    @GetMapping
    public List<AlertResponse> findByLine(@PathVariable Long lineId) {
        return alertService.findActiveByLine(lineId);
    }
}
