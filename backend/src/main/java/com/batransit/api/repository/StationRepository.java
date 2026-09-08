package com.batransit.api.repository;

import com.batransit.api.domain.Station;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StationRepository extends JpaRepository<Station, Long> {

    List<Station> findByTransportLineIdOrderBySequenceOrderAsc(Long transportLineId);
}
