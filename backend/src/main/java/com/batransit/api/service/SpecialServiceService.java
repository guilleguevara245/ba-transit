package com.batransit.api.service;

import com.batransit.api.domain.SpecialService;
import com.batransit.api.domain.TransportLine;
import com.batransit.api.dto.SpecialServiceRequest;
import com.batransit.api.dto.SpecialServiceResponse;
import com.batransit.api.exception.BadRequestException;
import com.batransit.api.exception.NotFoundException;
import com.batransit.api.repository.SpecialServiceRepository;
import com.batransit.api.repository.TransportLineRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
public class SpecialServiceService {

    /** Las fechas de vigencia son dias de Buenos Aires, no de UTC. */
    static final ZoneId BUENOS_AIRES = ZoneId.of("America/Argentina/Buenos_Aires");

    private final SpecialServiceRepository repository;
    private final TransportLineRepository lineRepository;
    private final Clock clock;

    public SpecialServiceService(SpecialServiceRepository repository, TransportLineRepository lineRepository) {
        this(repository, lineRepository, Clock.system(BUENOS_AIRES));
    }

    SpecialServiceService(SpecialServiceRepository repository, TransportLineRepository lineRepository, Clock clock) {
        this.repository = repository;
        this.lineRepository = lineRepository;
        this.clock = clock;
    }

    /** Servicios vigentes hoy; con lineId, solo los de esa linea. */
    @Transactional(readOnly = true)
    public List<SpecialServiceResponse> findValidToday(Long lineId) {
        LocalDate today = LocalDate.now(clock.withZone(BUENOS_AIRES));
        return repository.findValidOn(today).stream()
                .filter(s -> lineId == null || s.getTransportLine().getId().equals(lineId))
                .map(SpecialServiceResponse::from)
                .toList();
    }

    @Transactional
    public SpecialServiceResponse create(SpecialServiceRequest request) {
        if (request.validUntil() != null && request.validUntil().isBefore(request.validFrom())) {
            throw new BadRequestException("validUntil no puede ser anterior a validFrom.");
        }
        TransportLine line = lineRepository.findById(request.lineId())
                .orElseThrow(() -> new NotFoundException("No existe una línea con id " + request.lineId()));
        SpecialService saved = repository.save(new SpecialService(line, request.kind(), request.title().trim(),
                blankToNull(request.description()), blankToNull(request.days()), blankToNull(request.schedule()),
                request.validFrom(), request.validUntil(), blankToNull(request.url())));
        return SpecialServiceResponse.from(saved);
    }

    /** Lo da de baja (no lo borra), por si hay que revisar que se publico. */
    @Transactional
    public void deactivate(Long id) {
        SpecialService service = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("No existe el servicio especial " + id));
        service.deactivate();
    }

    private static String blankToNull(String text) {
        return text == null || text.isBlank() ? null : text.trim();
    }
}
