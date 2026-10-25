package com.batransit.api.service;

import com.batransit.api.dto.LineResponse;
import com.batransit.api.dto.SearchResponse;
import com.batransit.api.repository.StationRepository;
import com.batransit.api.repository.TransportLineRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;

/**
 * Busqueda combinada de lineas y estaciones.
 *
 * - No distingue tildes ni mayusculas: "peru" encuentra "Perú". El texto
 *   buscado se normaliza aca igual que la columna search_name en la base.
 * - Menos de MIN_LENGTH caracteres devuelve una respuesta vacia (con "a"
 *   se devolvia casi toda la base).
 * - Como maximo MAX_RESULTS resultados por tipo.
 * - % y _ se buscan literalmente, no como comodines de LIKE.
 */
@Service
public class SearchService {

    static final int MIN_LENGTH = 2;
    static final int MAX_LENGTH = 100;
    static final int MAX_RESULTS = 20;

    private static final char LIKE_ESCAPE = '!';

    private final TransportLineRepository transportLineRepository;
    private final StationRepository stationRepository;

    public SearchService(TransportLineRepository transportLineRepository, StationRepository stationRepository) {
        this.transportLineRepository = transportLineRepository;
        this.stationRepository = stationRepository;
    }

    public SearchResponse search(String query) {
        String normalized = normalize(query);
        if (normalized.length() < MIN_LENGTH) {
            return new SearchResponse(List.of(), List.of());
        }
        if (normalized.length() > MAX_LENGTH) {
            normalized = normalized.substring(0, MAX_LENGTH);
        }

        String pattern = "%" + escapeLike(normalized) + "%";
        Pageable limit = PageRequest.of(0, MAX_RESULTS);

        return new SearchResponse(
                transportLineRepository.search(pattern, limit).stream().map(LineResponse::from).toList(),
                stationRepository.search(pattern, limit)
        );
    }

    /** "  Sáenz PEÑA " -> "saenz pena". */
    static String normalize(String text) {
        if (text == null) {
            return "";
        }
        String withoutAccents = Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return withoutAccents.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    /** Escapa los comodines de LIKE para que se busquen como texto. */
    static String escapeLike(String text) {
        StringBuilder escaped = new StringBuilder(text.length());
        for (char c : text.toCharArray()) {
            if (c == LIKE_ESCAPE || c == '%' || c == '_') {
                escaped.append(LIKE_ESCAPE);
            }
            escaped.append(c);
        }
        return escaped.toString();
    }
}
