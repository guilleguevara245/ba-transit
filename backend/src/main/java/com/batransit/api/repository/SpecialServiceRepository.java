package com.batransit.api.repository;

import com.batransit.api.domain.SpecialService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface SpecialServiceRepository extends JpaRepository<SpecialService, Long> {

    /** Vigentes en la fecha dada, con la linea ya cargada (open-in-view esta apagado). */
    @Query("SELECT s FROM SpecialService s JOIN FETCH s.transportLine "
            + "WHERE s.active = true AND s.validFrom <= :day AND (s.validUntil IS NULL OR s.validUntil >= :day) "
            + "ORDER BY s.validFrom DESC, s.id DESC")
    List<SpecialService> findValidOn(@Param("day") LocalDate day);
}
