package com.batransit.api.repository;

import com.batransit.api.domain.Fare;
import com.batransit.api.domain.TransportMode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FareRepository extends JpaRepository<Fare, Long> {

    List<Fare> findByActiveTrueOrderByModeAscMinKmAsc();

    List<Fare> findByModeAndActiveTrueOrderByMinKmAsc(TransportMode mode);
}
