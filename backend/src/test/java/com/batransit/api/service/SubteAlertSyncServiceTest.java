package com.batransit.api.service;

import com.batransit.api.client.SubteAlertsFeed;
import com.batransit.api.client.SubteAlertsFeed.FeedAlert;
import com.batransit.api.client.SubteAlertsFeed.FeedEntity;
import com.batransit.api.client.SubteAlertsFeed.InformedEntity;
import com.batransit.api.client.SubteAlertsFeed.TranslatedText;
import com.batransit.api.client.SubteAlertsFeed.Translation;
import com.batransit.api.client.TransporteApiClient;
import com.batransit.api.client.TransporteApiException;
import com.batransit.api.domain.Alert;
import com.batransit.api.domain.AlertType;
import com.batransit.api.domain.TransportLine;
import com.batransit.api.domain.TransportMode;
import com.batransit.api.repository.AlertRepository;
import com.batransit.api.repository.TransportLineRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.transaction.PlatformTransactionManager;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class SubteAlertSyncServiceTest {

    private TransporteApiClient apiClient;
    private AlertRepository alertRepository;
    private TransportLineRepository lineRepository;
    private SubteAlertSyncService service;

    private final TransportLine lineaA = new TransportLine(TransportMode.SUBTE, "A", "Línea A", "#00A8E1");
    private final TransportLine lineaC = new TransportLine(TransportMode.SUBTE, "C", "Línea C", "#0057A8");

    @BeforeEach
    void setUp() {
        apiClient = mock(TransporteApiClient.class);
        alertRepository = mock(AlertRepository.class);
        lineRepository = mock(TransportLineRepository.class);
        // Un PlatformTransactionManager mockeado alcanza: TransactionTemplate
        // solo le pide la transaccion y la confirma.
        service = new SubteAlertSyncService(apiClient, alertRepository, lineRepository,
                mock(PlatformTransactionManager.class));

        when(lineRepository.findByModeAndCodeIgnoreCase(TransportMode.SUBTE, "A")).thenReturn(Optional.of(lineaA));
        when(lineRepository.findByModeAndCodeIgnoreCase(TransportMode.SUBTE, "C")).thenReturn(Optional.of(lineaC));
    }

    @Test
    void creaUnaAlertaNueva() {
        when(apiClient.fetchSubteAlerts()).thenReturn(feed(entity("alerta-1", 1, "Servicio interrumpido", "LineaA")));

        service.sync();

        ArgumentCaptor<Alert> saved = ArgumentCaptor.forClass(Alert.class);
        verify(alertRepository).save(saved.capture());
        assertThat(saved.getValue().getExternalId()).isEqualTo("alerta-1");
        assertThat(saved.getValue().getType()).isEqualTo(AlertType.INTERRUPCION);
        assertThat(saved.getValue().getDescription()).isEqualTo("Servicio interrumpido");
        assertThat(saved.getValue().isActive()).isTrue();
    }

    @Test
    void actualizaUnaAlertaExistenteSinDuplicarla() {
        Alert existing = new Alert(lineaA, AlertType.DEMORA, "Texto viejo", "API Transporte", "alerta-1", null, 3);
        when(alertRepository.findByExternalId("alerta-1")).thenReturn(Optional.of(existing));
        when(apiClient.fetchSubteAlerts()).thenReturn(feed(entity("alerta-1", 4, "Texto nuevo", "LineaA")));

        service.sync();

        verify(alertRepository, never()).save(any());
        assertThat(existing.getDescription()).isEqualTo("Texto nuevo");
        assertThat(existing.getType()).isEqualTo(AlertType.DESVIO);
    }

    @Test
    void desactivaLasAlertasQueYaNoEstanEnElFeed() {
        Alert resuelta = new Alert(lineaA, AlertType.DEMORA, "Ya resuelta", "API Transporte", "vieja", null, null);
        Alert vigente = new Alert(lineaA, AlertType.DEMORA, "Sigue", "API Transporte", "alerta-1", null, null);
        when(alertRepository.findByActiveTrueAndExternalIdIsNotNull()).thenReturn(List.of(resuelta, vigente));
        when(alertRepository.findByExternalId("alerta-1")).thenReturn(Optional.of(vigente));
        when(apiClient.fetchSubteAlerts()).thenReturn(feed(entity("alerta-1", 3, "Sigue", "LineaA")));

        service.sync();

        assertThat(resuelta.isActive()).isFalse();
        assertThat(vigente.isActive()).isTrue();
    }

    @Test
    void noTocaLasAlertasDeOtrasFuentes() {
        Alert deTrenes = new Alert(lineaA, AlertType.OBRA, "Aviso de trenes", "Trenes Argentinos", "trenes-ar:x", null, null);
        when(alertRepository.findByActiveTrueAndExternalIdIsNotNull()).thenReturn(List.of(deTrenes));
        when(apiClient.fetchSubteAlerts()).thenReturn(feed(entity("alerta-1", 3, "Sigue", "LineaA")));

        service.sync();

        assertThat(deTrenes.isActive()).isTrue();
    }

    @Test
    void noDesactivaUnaAlertaVigenteSiFallaSuProcesamiento() {
        Alert vigente = new Alert(lineaA, AlertType.DEMORA, "Sigue", "API Transporte", "alerta-rota", null, null);
        when(alertRepository.findByActiveTrueAndExternalIdIsNotNull()).thenReturn(List.of(vigente));
        when(lineRepository.findByModeAndCodeIgnoreCase(TransportMode.SUBTE, "B"))
                .thenThrow(new IllegalStateException("falla simulada"));
        when(apiClient.fetchSubteAlerts()).thenReturn(feed(entity("alerta-rota", 3, "Sigue", "LineaB")));

        service.sync();

        assertThat(vigente.isActive()).isTrue();
    }

    @Test
    void siLaApiFallaNoTocaNada() {
        when(apiClient.fetchSubteAlerts()).thenThrow(new TransporteApiException("HTTP 503"));

        service.sync();

        verifyNoInteractions(alertRepository);
    }

    @Test
    void siLaRespuestaEsInvalidaNoTocaNada() {
        when(apiClient.fetchSubteAlerts()).thenReturn(new SubteAlertsFeed(null));

        service.sync();

        verifyNoInteractions(alertRepository);
    }

    @Test
    void unaAlertaQueAfectaVariasLineasSeRegistraEnCadaUna() {
        when(apiClient.fetchSubteAlerts())
                .thenReturn(feed(entity("combinacion", 3, "Demoras", "LineaA", "LineaC", "LineaA")));

        service.sync();

        verify(alertRepository).findByExternalId("combinacion#A");
        verify(alertRepository).findByExternalId("combinacion#C");
        verify(alertRepository, times(2)).save(any(Alert.class));
    }

    @Test
    void ignoraLineasQueNoExisten() {
        when(lineRepository.findByModeAndCodeIgnoreCase(eq(TransportMode.SUBTE), anyString()))
                .thenReturn(Optional.empty());
        when(apiClient.fetchSubteAlerts()).thenReturn(feed(entity("x", 3, "Demoras", "LineaZ")));

        service.sync();

        verify(alertRepository, never()).save(any());
    }

    @Test
    void helpersEstaticos() {
        assertThat(SubteAlertSyncService.extractLineCode("LineaA")).isEqualTo("A");
        assertThat(SubteAlertSyncService.extractLineCode("LíneaH")).isEqualTo("H");
        assertThat(SubteAlertSyncService.extractLineCode(null)).isEmpty();
        // Premetro: sus ramales del GTFS o el nombre, todos son la linea P.
        assertThat(SubteAlertSyncService.extractLineCode("PM-C")).isEqualTo("P");
        assertThat(SubteAlertSyncService.extractLineCode("PM-S")).isEqualTo("P");
        assertThat(SubteAlertSyncService.extractLineCode("Premetro")).isEqualTo("P");
        assertThat(SubteAlertSyncService.modeFor("P")).isEqualTo(TransportMode.PREMETRO);
        assertThat(SubteAlertSyncService.modeFor("A")).isEqualTo(TransportMode.SUBTE);

        assertThat(SubteAlertSyncService.feedEntityIdOf("alerta#C")).isEqualTo("alerta");
        assertThat(SubteAlertSyncService.feedEntityIdOf("alerta")).isEqualTo("alerta");

        assertThat(SubteAlertSyncService.mapEffectToType(1)).isEqualTo(AlertType.INTERRUPCION);
        assertThat(SubteAlertSyncService.mapEffectToType(4)).isEqualTo(AlertType.DESVIO);
        assertThat(SubteAlertSyncService.mapEffectToType(null)).isEqualTo(AlertType.DEMORA);
    }

    private static SubteAlertsFeed feed(FeedEntity... entities) {
        return new SubteAlertsFeed(Arrays.asList(entities));
    }

    private static FeedEntity entity(String id, Integer effect, String description, String... routeIds) {
        List<InformedEntity> informed = Arrays.stream(routeIds).map(InformedEntity::new).toList();
        TranslatedText text = new TranslatedText(List.of(new Translation(description, "es")));
        return new FeedEntity(id, new FeedAlert(informed, null, text, null, effect));
    }
}
