package com.batransit.api.service;

import com.batransit.api.domain.Fare;
import com.batransit.api.dto.FareRequest;
import com.batransit.api.repository.FareRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FareService {

    private final FareRepository fareRepository;

    public FareService(FareRepository fareRepository) {
        this.fareRepository = fareRepository;
    }

    public List<Fare> findAllActive() {
        return fareRepository.findByActiveTrueOrderByModeAscMinKmAsc();
    }

    public List<Fare> findActiveByMode(String mode) {
        return fareRepository.findByModeIgnoreCaseAndActiveTrueOrderByMinKmAsc(mode);
    }

    public Fare create(FareRequest request) {
        Fare fare = new Fare(
                request.mode().toUpperCase(),
                request.minKm(),
                request.maxKm(),
                request.price(),
                request.effectiveFrom()
        );
        return fareRepository.save(fare);
    }
}
