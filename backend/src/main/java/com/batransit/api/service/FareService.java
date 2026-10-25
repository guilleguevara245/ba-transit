package com.batransit.api.service;

import com.batransit.api.domain.Fare;
import com.batransit.api.domain.TransportMode;
import com.batransit.api.dto.FareRequest;
import com.batransit.api.dto.FareResponse;
import com.batransit.api.exception.BadRequestException;
import com.batransit.api.repository.FareRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FareService {

    private final FareRepository fareRepository;

    public FareService(FareRepository fareRepository) {
        this.fareRepository = fareRepository;
    }

    public List<FareResponse> findAllActive() {
        return fareRepository.findByActiveTrueOrderByModeAscMinKmAsc().stream()
                .map(FareResponse::from)
                .toList();
    }

    public List<FareResponse> findActiveByMode(TransportMode mode) {
        return fareRepository.findByModeAndActiveTrueOrderByMinKmAsc(mode).stream()
                .map(FareResponse::from)
                .toList();
    }

    public FareResponse create(FareRequest request) {
        validateKmRange(request);
        Fare fare = new Fare(
                request.mode(),
                request.minKm(),
                request.maxKm(),
                request.price(),
                request.effectiveFrom()
        );
        return FareResponse.from(fareRepository.save(fare));
    }

    /**
     * Reglas del tramo (ver Fare): sin minKm ni maxKm es tarifa plana;
     * con solo minKm es "de minKm en adelante"; con ambos, minKm debe
     * ser menor que maxKm. maxKm sin minKm no tiene sentido.
     */
    private void validateKmRange(FareRequest request) {
        if (request.maxKm() != null && request.minKm() == null) {
            throw new BadRequestException("Si se indica maxKm, tambien hay que indicar minKm.");
        }
        if (request.minKm() != null && request.maxKm() != null
                && request.minKm().compareTo(request.maxKm()) >= 0) {
            throw new BadRequestException("minKm debe ser menor que maxKm.");
        }
    }
}
