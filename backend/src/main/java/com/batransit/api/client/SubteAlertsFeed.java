package com.batransit.api.client;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Estos records mapean la respuesta del feed GTFS-Realtime en JSON de
 * la API Transporte (endpoint /subtes/serviceAlerts?json=1). Solo se
 * declaran los campos que realmente usamos; cualquier otro campo del
 * JSON (header.timestamp, trip_update, vehicle, etc.) se ignora
 * automaticamente al deserializar.
 */
public record SubteAlertsFeed(List<FeedEntity> entity) {

    public record FeedEntity(String id, FeedAlert alert) {
    }

    public record FeedAlert(
            @JsonProperty("informed_entity") List<InformedEntity> informedEntity,
            @JsonProperty("header_text") TranslatedText headerText,
            @JsonProperty("description_text") TranslatedText descriptionText,
            Integer cause,
            Integer effect
    ) {
    }

    public record InformedEntity(@JsonProperty("route_id") String routeId) {
    }

    public record TranslatedText(List<Translation> translation) {
    }

    public record Translation(String text, String language) {
    }
}
