package com.batransit.api.repository;

import com.batransit.api.domain.TransportLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TransportLineRepository extends JpaRepository<TransportLine, Long> {

    List<TransportLine> findByModeIgnoreCaseOrderByCodeAsc(String mode);
}
