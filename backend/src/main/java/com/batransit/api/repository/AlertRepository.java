package com.batransit.api.repository;

import com.batransit.api.domain.Alert;
import com.batransit.api.dto.LineAlertCountRow;
import com.batransit.api.dto.LineTypeCountRow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface AlertRepository extends JpaRepository<Alert, Long> {

    List<Alert> findByActiveTrueOrderByPublishedAtDesc();

    List<Alert> findByTransportLineIdAndActiveTrueOrderByPublishedAtDesc(Long transportLineId);

    Optional<Alert> findByExternalId(String externalId);

    List<Alert> findByActiveTrueAndExternalIdIsNotNullAndExternalIdNotIn(List<String> externalIds);

    @Query("SELECT new com.batransit.api.dto.LineAlertCountRow("
            + "tl.id, tl.name, tl.colorHex, COUNT(a), "
            + "SUM(CASE WHEN a.active = true THEN 1L ELSE 0L END)) "
            + "FROM Alert a JOIN a.transportLine tl "
            + "GROUP BY tl.id, tl.name, tl.colorHex "
            + "ORDER BY COUNT(a) DESC")
    List<LineAlertCountRow> countByLine();

    @Query("SELECT new com.batransit.api.dto.LineTypeCountRow(a.transportLine.id, a.type, COUNT(a)) "
            + "FROM Alert a "
            + "GROUP BY a.transportLine.id, a.type")
    List<LineTypeCountRow> countByLineAndType();
}
