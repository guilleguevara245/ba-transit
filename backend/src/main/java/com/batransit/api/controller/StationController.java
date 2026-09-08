package com.batransit.api.controller;

import com.batransit.api.domain.Station;
import com.batransit.api.service.StationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/branches/{branchId}/stations")
public class StationController {

    private final StationService stationService;

    public StationController(StationService stationService) {
        this.stationService = stationService;
    }

    @GetMapping
    public List<Station> findByBranch(@PathVariable Long branchId) {
        return stationService.findByBranchId(branchId);
    }
}
