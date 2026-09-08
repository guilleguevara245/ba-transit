package com.batransit.api.repository;

import com.batransit.api.domain.Station;
import com.batransit.api.dto.StationSearchResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface StationRepository extends JpaRepository<Station, Long> {

    List<Station> findByBranchIdOrderBySequenceOrderAsc(Long branchId);

    @Query("SELECT new com.batransit.api.dto.StationSearchResult("
            + "s.id, s.name, tl.id, tl.name, tl.colorHex, s.sequenceOrder) "
            + "FROM Station s JOIN s.branch b JOIN b.transportLine tl "
            + "WHERE s.active = true AND LOWER(s.name) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<StationSearchResult> search(@Param("query") String query);
}
