package com.batransit.api.dto;

import com.batransit.api.domain.TransportLine;
import com.batransit.api.domain.TransportMode;

/**
 * Detalle de una linea (GET /api/v1/lines/{id}): lo mismo que
 * LineResponse mas la informacion institucional (operador, ferrocarril
 * de origen, anio de inauguracion). El listado usa LineResponse, mas liviano.
 */
public record LineDetailResponse(
        Long id,
        TransportMode mode,
        String code,
        String name,
        String colorHex,
        boolean active,
        String operator,
        String operatorType,
        String historicName,
        Integer openedYear
) {
    public static LineDetailResponse from(TransportLine line) {
        return new LineDetailResponse(line.getId(), line.getMode(), line.getCode(), line.getName(),
                line.getColorHex(), line.isActive(), line.getOperator(), line.getOperatorType(),
                line.getHistoricName(), line.getOpenedYear());
    }
}
