package com.batransit.api.config;

import com.batransit.api.config.DatabaseUrlEnvironmentPostProcessor.JdbcTarget;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DatabaseUrlEnvironmentPostProcessorTest {

    private static final String SUPABASE = "postgresql://postgres.abcdef:Clave123@aws-0-us-east-1.pooler.supabase.com"
            + ":5432/postgres?sslmode=require";

    @Test
    void leeLaDireccionDeSupabase() {
        JdbcTarget t = DatabaseUrlEnvironmentPostProcessor.parse(SUPABASE);

        assertThat(t.url()).isEqualTo(
                "jdbc:postgresql://aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require");
        assertThat(t.username()).isEqualTo("postgres.abcdef");
        assertThat(t.password()).isEqualTo("Clave123");
    }

    @Test
    void sinPuertoNiSslmodeUsaLosDeSiempreYDescartaElResto() {
        JdbcTarget t = DatabaseUrlEnvironmentPostProcessor.parse(
                "postgresql://neondb_owner:a%40b%2Bc@ep-x.sa-east-1.aws.neon.tech/neondb?channel_binding=require");

        assertThat(t.url()).isEqualTo("jdbc:postgresql://ep-x.sa-east-1.aws.neon.tech:5432/neondb?sslmode=require");
        assertThat(t.password()).isEqualTo("a@b+c");
    }

    @Test
    void rechazaLoQueNoEsUnaDireccionDePostgres() {
        assertThatThrownBy(() -> DatabaseUrlEnvironmentPostProcessor.parse("https://supabase.com"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> DatabaseUrlEnvironmentPostProcessor.parse("postgresql://host:5432/db"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void conDatabaseUrlGanaSobreLasDbYSinEllaNoCambiaNada() {
        MockEnvironment env = new MockEnvironment()
                .withProperty("DATABASE_URL", SUPABASE)
                .withProperty("DB_HOST", "localhost");
        new DatabaseUrlEnvironmentPostProcessor().postProcessEnvironment(env, null);

        assertThat(env.getProperty("spring.datasource.url")).contains("pooler.supabase.com");
        assertThat(env.getProperty("spring.datasource.username")).isEqualTo("postgres.abcdef");
        assertThat(env.getProperty("spring.datasource.password")).isEqualTo("Clave123");

        MockEnvironment none = new MockEnvironment().withProperty("DB_HOST", "localhost");
        new DatabaseUrlEnvironmentPostProcessor().postProcessEnvironment(none, null);
        assertThat(none.getProperty("spring.datasource.url")).isNull();
    }
}
