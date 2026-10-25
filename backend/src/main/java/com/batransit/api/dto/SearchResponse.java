package com.batransit.api.dto;

import java.util.List;

public record SearchResponse(
        List<LineResponse> lines,
        List<StationSearchResult> stations
) {
}
