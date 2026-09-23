package com.batransit.api.service;

import com.batransit.api.dto.MapStation;
import com.batransit.api.repository.StationRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MapService {

    private final StationRepository stationRepository;

    public MapService(StationRepository stationRepository) {
        this.stationRepository = stationRepository;
    }

    public List<MapStation> stationsByMode(String mode) {
        return stationRepository.findMapStationsByMode(mode.toUpperCase());
    }
}
