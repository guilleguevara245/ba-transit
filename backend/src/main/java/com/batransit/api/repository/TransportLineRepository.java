package com.batransit.api.repository;

import com.batransit.api.domain.TransportLine;
import com.batransit.api.domain.TransportMode;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TransportLineRepository extends JpaRepository<TransportLine, Long> {

    List<TransportLine> findByModeOrderByCodeAsc(TransportMode mode);

    Optional<TransportLine> findByModeAndCodeIgnoreCase(TransportMode mode, String code);

    @Query("SELECT tl FROM TransportLine tl WHERE tl.active = true AND "
            + "(tl.searchName LIKE :pattern ESCAPE '!' OR LOWER(tl.code) LIKE :pattern ESCAPE '!') "
            + "ORDER BY tl.mode ASC, tl.code ASC")
    List<TransportLine> search(@Param("pattern") String pattern, Pageable pageable);
}
