package com.batransit.api.controller;

import com.batransit.api.dto.LineAlertStats;
import com.batransit.api.service.StatsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/stats")
public class StatsController {

    private final StatsService statsService;

    public StatsController(StatsService statsService) {
        this.statsService = statsService;
    }

    @GetMapping("/alerts")
    public List<LineAlertStats> alertStatsByLine() {
        return statsService.alertStatsByLine();
    }
}
