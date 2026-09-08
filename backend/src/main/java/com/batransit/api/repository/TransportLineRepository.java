package com.batransit.api.repository;

import com.batransit.api.domain.TransportLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TransportLineRepository extends JpaRepository<TransportLine, Long> {

    List<TransportLine> findByModeIgnoreCaseOrderByCodeAsc(String mode);

    @Query("SELECT tl FROM TransportLine tl WHERE tl.active = true AND "
            + "(LOWER(tl.name) LIKE LOWER(CONCAT('%', :query, '%')) "
            + "OR LOWER(tl.code) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<TransportLine> search(@Param("query") String query);
}
