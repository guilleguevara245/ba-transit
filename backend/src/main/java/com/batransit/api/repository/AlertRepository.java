package com.batransit.api.repository;

import com.batransit.api.domain.Alert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AlertRepository extends JpaRepository<Alert, Long> {

    List<Alert> findByActiveTrueOrderByPublishedAtDesc();

    List<Alert> findByTransportLineIdAndActiveTrueOrderByPublishedAtDesc(Long transportLineId);
}
