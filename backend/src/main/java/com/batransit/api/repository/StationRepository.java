package com.batransit.api.repository;

import com.batransit.api.domain.Station;
import com.batransit.api.domain.TransportMode;
import com.batransit.api.dto.MapStation;
import com.batransit.api.dto.StationSearchResult;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface StationRepository extends JpaRepository<Station, Long> {

    List<Station> findByBranchIdOrderBySequenceOrderAsc(Long branchId);

    @Query("SELECT new com.batransit.api.dto.StationSearchResult("
            + "s.id, s.name, tl.id, tl.name, tl.colorHex, s.sequenceOrder) "
            + "FROM Station s JOIN s.branch b JOIN b.transportLine tl "
            + "WHERE s.active = true AND s.searchName LIKE :pattern ESCAPE '!' "
            + "ORDER BY s.name ASC, tl.name ASC")
    List<StationSearchResult> search(@Param("pattern") String pattern, Pageable pageable);

    @Query("SELECT new com.batransit.api.dto.MapStation("
            + "s.id, s.name, s.latitude, s.longitude, b.id, tl.id, tl.code, tl.name, tl.colorHex, s.sequenceOrder) "
            + "FROM Station s JOIN s.branch b JOIN b.transportLine tl "
            + "WHERE tl.mode = :mode AND s.active = true "
            + "AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL "
            + "ORDER BY tl.code ASC, b.id ASC, s.sequenceOrder ASC")
    List<MapStation> findMapStationsByMode(@Param("mode") TransportMode mode);
}
