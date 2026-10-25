package com.batransit.api.dto;

import com.batransit.api.domain.Branch;

public record BranchResponse(
        Long id,
        Long transportLineId,
        String name,
        boolean active
) {
    public static BranchResponse from(Branch branch) {
        return new BranchResponse(branch.getId(), branch.transportLineId(), branch.getName(), branch.isActive());
    }
}
