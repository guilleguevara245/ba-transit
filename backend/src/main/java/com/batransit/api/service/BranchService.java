package com.batransit.api.service;

import com.batransit.api.domain.Branch;
import com.batransit.api.repository.BranchRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BranchService {

    private final BranchRepository branchRepository;

    public BranchService(BranchRepository branchRepository) {
        this.branchRepository = branchRepository;
    }

    public List<Branch> findByLineId(Long lineId) {
        return branchRepository.findByTransportLineIdOrderByIdAsc(lineId);
    }
}
