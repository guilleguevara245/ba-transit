package com.batransit.api.service;

import com.batransit.api.domain.Station;
import com.batransit.api.repository.StationRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class StationService {

    private final StationRepository stationRepository;

    public StationService(StationRepository stationRepository) {
        this.stationRepository = stationRepository;
    }

    public List<Station> findByLineId(Long lineId) {
        return stationRepository.findByTransportLineIdOrderBySequenceOrderAsc(lineId);
    }
}
