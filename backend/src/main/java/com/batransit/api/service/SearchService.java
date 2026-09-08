package com.batransit.api.service;

import com.batransit.api.dto.SearchResponse;
import com.batransit.api.repository.StationRepository;
import com.batransit.api.repository.TransportLineRepository;
import org.springframework.stereotype.Service;

@Service
public class SearchService {

    private final TransportLineRepository transportLineRepository;
    private final StationRepository stationRepository;

    public SearchService(TransportLineRepository transportLineRepository, StationRepository stationRepository) {
        this.transportLineRepository = transportLineRepository;
        this.stationRepository = stationRepository;
    }

    public SearchResponse search(String query) {
        return new SearchResponse(
                transportLineRepository.search(query),
                stationRepository.search(query)
        );
    }
}
