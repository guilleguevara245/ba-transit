package com.batransit.api.colectivos;

import com.batransit.api.colectivos.BusModels.Catalog;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class ColectivoSnapshotStoreTest {

    @TempDir
    Path tmp;

    @Test
    void laCopiaComprimidaSeLeeIgualQueElOriginal() throws IOException {
        Catalog original = new GtfsColectivosParser().parse(
                GtfsColectivosParserTest.writeZip(tmp, GtfsColectivosParserTest.sampleFeed()));
        ColectivoSnapshotStore store = new ColectivoSnapshotStore(null, new ObjectMapper().findAndRegisterModules());

        Catalog restored = store.decompress(store.compress(original));

        assertThat(restored.loadedAt()).isEqualTo(original.loadedAt());
        assertThat(restored.routes().keySet()).isEqualTo(original.routes().keySet());
        assertThat(restored.routes().get("R152").directions().get(0).stops())
                .isEqualTo(original.routes().get("R152").directions().get(0).stops());
        assertThat(restored.routes().get("R152").directions().get(0).shape())
                .usingRecursiveComparison().isEqualTo(original.routes().get("R152").directions().get(0).shape());
    }
}
