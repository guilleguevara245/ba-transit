package com.batransit.api.repository;

import com.batransit.api.domain.Alert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AlertRepository extends JpaRepository<Alert, Long> {

    List<Alert> findByActiveTrueOrderByPublishedAtDesc();

    List<Alert> findByTransportLineIdAndActiveTrueOrderByPublishedAtDesc(Long transportLineId);

    Optional<Alert> findByExternalId(String externalId);

    List<Alert> findByActiveTrueAndExternalIdIsNotNullAndExternalIdNotIn(List<String> externalIds);
}
