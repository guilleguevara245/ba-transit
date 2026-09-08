package com.batransit.api.dto;

import com.batransit.api.domain.TransportLine;

import java.util.List;

public record SearchResponse(
        List<TransportLine> lines,
        List<StationSearchResult> stations
) {
}
