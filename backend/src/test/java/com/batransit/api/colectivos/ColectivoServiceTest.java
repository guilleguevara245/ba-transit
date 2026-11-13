package com.batransit.api.colectivos;

import com.batransit.api.colectivos.BusModels.BusRoute;
import com.batransit.api.config.TransporteApiProperties;
import com.batransit.api.exception.NotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ColectivoServiceTest {

    @TempDir
    Path tmp;

    private ColectivoService loadedService() throws IOException {
        ColectivoService service = new ColectivoService(new TransporteApiProperties(), "", "/colectivos/feed-gtfs");
        service.load(new GtfsColectivosParser().parse(
                GtfsColectivosParserTest.writeZip(tmp, GtfsColectivosParserTest.sampleFeed())));
        return service;
    }

    @Test
    void sinDatosCargadosResponde503() {
        ColectivoService service = new ColectivoService(new TransporteApiProperties(), "", "/colectivos/feed-gtfs");

        assertThat(service.current()).isEmpty();
        assertThatThrownBy(() -> service.search("152")).isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void buscaPorNumeroYPorNombre() throws IOException {
        ColectivoService service = loadedService();

        assertThat(service.search("152")).extracting(BusRoute::id).containsExactly("R152");
        assertThat(service.search("ezeiza")).extracting(BusRoute::id).containsExactly("R8");
        assertThat(service.search("   ")).isEmpty();
    }

    @Test
    void soloPideElFeedSiNoHayDatosOSonViejos() throws IOException {
        ColectivoService empty = new ColectivoService(new TransporteApiProperties(), "", "/colectivos/feed-gtfs");
        assertThat(empty.needsRefresh(Duration.ofHours(24), Instant.now())).isTrue();

        ColectivoService service = loadedService();
        Instant loadedAt = service.current().orElseThrow().loadedAt();
        assertThat(service.needsRefresh(Duration.ofHours(24), loadedAt.plus(Duration.ofHours(2)))).isFalse();
        assertThat(service.needsRefresh(Duration.ofHours(24), loadedAt.plus(Duration.ofHours(25)))).isTrue();
    }

    @Test
    void siElUltimoIntentoNoTerminoNoReintentaEnseguida() throws IOException {
        // La copia de la base es de hace 30 horas y el servidor se reinicio a mitad de una
        // descarga hace 1 hora (por ejemplo, por memoria): no tiene que volver a bajar el feed.
        Instant now = Instant.parse("2026-11-06T12:00:00Z");
        BusModels.Catalog old = new BusModels.Catalog(loadedService().current().orElseThrow().routes(),
                now.minus(Duration.ofHours(30)));
        ColectivoSnapshotStore store = new ColectivoSnapshotStore(null, null) {
            @Override
            public java.util.Optional<BusModels.Catalog> load() {
                return java.util.Optional.of(old);
            }

            @Override
            public java.util.Optional<Instant> lastAttempt() {
                return java.util.Optional.of(now.minus(Duration.ofHours(1)));
            }
        };
        ColectivoService service = new ColectivoService(new TransporteApiProperties(), "", "/colectivos/feed-gtfs", store);
        service.restoreSnapshot();
        assertThat(service.needsRefresh(Duration.ofHours(24), now)).isFalse();
        // Pasadas las 6 horas de espera desde ese intento, si.
        assertThat(service.needsRefresh(Duration.ofHours(24), now.plus(Duration.ofHours(6)))).isTrue();
    }

    @Test
    void laCopiaConLetrasPerdidasSeArreglaAlCargarla() throws IOException {
        // La copia (de hace 2 horas) la guardo una version que no adivinaba las letras: "MU?ECAS".
        Instant now = Instant.parse("2026-11-13T02:00:00Z");
        BusModels.Catalog fresh = loadedService().current().orElseThrow();
        BusModels.BusRoute any = fresh.routes().values().iterator().next();
        BusModels.BusDirection d = any.directions().get(0);
        java.util.List<BusModels.BusStop> stops = new java.util.ArrayList<>(d.stops());
        BusModels.BusStop first = stops.get(0);
        stops.set(0, new BusModels.BusStop(first.id(), "893 MU?ECAS", first.latitude(), first.longitude()));
        BusModels.BusRoute broken = new BusModels.BusRoute(any.id(), any.shortName(), any.longName(), any.agency(),
                any.color(), java.util.List.of(new BusModels.BusDirection(d.directionId(), d.headsign(), d.shape(),
                stops, d.minutes())));
        java.util.Map<String, BusModels.BusRoute> routes = new java.util.HashMap<>(fresh.routes());
        routes.put(any.id(), broken);
        BusModels.Catalog old = new BusModels.Catalog(routes, now.minus(Duration.ofHours(2)));
        ColectivoSnapshotStore store = new ColectivoSnapshotStore(null, null) {
            @Override
            public java.util.Optional<BusModels.Catalog> load() {
                return java.util.Optional.of(old);
            }

            @Override
            public java.util.Optional<Instant> lastAttempt() {
                return java.util.Optional.empty();
            }
        };
        ColectivoService service = new ColectivoService(new TransporteApiProperties(), "", "/colectivos/feed-gtfs", store);
        service.restoreSnapshot();

        assertThat(service.find(any.id()).directions().get(0).stops().get(0).name()).isEqualTo("893 MUÑECAS");
        // No hace falta volver a bajar el feed por eso.
        assertThat(service.needsRefresh(Duration.ofHours(24), now)).isFalse();
    }

    @Test
    void lasLineasPorSuCartel() throws IOException {
        ColectivoService service = loadedService();
        assertThat(service.routesNamed(java.util.List.of("8", "60"))).extracting(BusRoute::id).containsExactly("R8");
        assertThat(service.routesNamed(java.util.List.of())).isEmpty();
    }

    @Test
    void elNumeroDeLaLineaSinElCartel() {
        assertThat(ColectivoService.lineNumber("42A")).isEqualTo("42");
        assertThat(ColectivoService.lineNumber("422-1C")).isEqualTo("422");
        assertThat(ColectivoService.lineNumber("R8/99")).isEqualTo("");
    }

    @Test
    void lineaInexistenteEsNotFound() throws IOException {
        ColectivoService service = loadedService();

        assertThatThrownBy(() -> service.find("NOPE")).isInstanceOf(NotFoundException.class);
        assertThat(service.find("R8").shortName()).isEqualTo("8");
    }

    @Test
    void siElIdDelFeedEnVivoNoEstaBuscaPorNumero() throws IOException {
        ColectivoService service = loadedService();

        assertThat(service.find("ID_VIEJO", "152", null).id()).isEqualTo("R152");
        assertThat(service.find("ID_VIEJO", "8A", null).id()).isEqualTo("R8");
        assertThatThrownBy(() -> service.find("ID_VIEJO", "999", null)).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> service.find("ID_VIEJO", null, null)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void lineasConParadaCerca() throws IOException {
        ColectivoService service = loadedService();
        BusRoute r152 = service.find("R152");
        var stop = r152.directions().get(0).stops().get(0);

        assertThat(service.near(stop.latitude(), stop.longitude(), 300))
                .extracting(n -> n.route().id()).contains("R152");
        assertThat(service.near(-31.4, -64.2, 300)).isEmpty();
    }
}
