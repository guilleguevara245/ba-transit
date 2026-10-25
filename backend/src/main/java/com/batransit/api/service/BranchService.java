package com.batransit.api.service;

import com.batransit.api.dto.BranchResponse;
import com.batransit.api.repository.BranchRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BranchService {

    private final BranchRepository branchRepository;

    public BranchService(BranchRepository branchRepository) {
        this.branchRepository = branchRepository;
    }

    public List<BranchResponse> findByLineId(Long lineId) {
        return branchRepository.findByTransportLineIdOrderByIdAsc(lineId).stream()
                .map(BranchResponse::from)
                .toList();
    }
}
