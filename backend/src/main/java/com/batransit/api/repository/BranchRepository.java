package com.batransit.api.repository;

import com.batransit.api.domain.Branch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BranchRepository extends JpaRepository<Branch, Long> {

    List<Branch> findByTransportLineIdOrderByIdAsc(Long transportLineId);
}
