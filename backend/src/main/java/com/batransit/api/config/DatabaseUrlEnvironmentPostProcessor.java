package com.batransit.api.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/**
 * Permite configurar la base con una sola variable, DATABASE_URL, con la
 * direccion tal como la dan Supabase o Neon
 * (postgresql://usuario:clave@host:puerto/base?sslmode=require), en vez de
 * DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD y DB_SSLMODE.
 *
 * Si ademas siguen las DB_* de otra base, esa queda como "base anterior":
 * al arrancar se copian sus datos a la nueva (ver DatabaseMoveConfig). Asi
 * mudar la base es agregar una variable en Render.
 */
public class DatabaseUrlEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    static final String PREVIOUS_URL = "batransit.base-anterior.url";
    static final String PREVIOUS_USER = "batransit.base-anterior.username";
    static final String PREVIOUS_PASSWORD = "batransit.base-anterior.password";

    /** La direccion de una base, lista para JDBC. */
    record JdbcTarget(String url, String username, String password) {
    }

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String databaseUrl = environment.getProperty("DATABASE_URL");
        if (databaseUrl == null || databaseUrl.isBlank()) {
            return;
        }
        JdbcTarget target = parse(databaseUrl);
        Map<String, Object> properties = new HashMap<>();
        properties.put("spring.datasource.url", target.url());
        properties.put("spring.datasource.username", target.username());
        properties.put("spring.datasource.password", target.password());

        String previousHost = environment.getProperty("DB_HOST");
        if (previousHost != null && !previousHost.isBlank() && !target.url().contains("//" + previousHost + ":")) {
            properties.put(PREVIOUS_URL, "jdbc:postgresql://" + previousHost + ":"
                    + environment.getProperty("DB_PORT", "5432") + "/"
                    + environment.getProperty("DB_NAME", "batransit")
                    + "?sslmode=" + environment.getProperty("DB_SSLMODE", "require"));
            properties.put(PREVIOUS_USER, environment.getProperty("DB_USER", ""));
            properties.put(PREVIOUS_PASSWORD, environment.getProperty("DB_PASSWORD", ""));
        }
        environment.getPropertySources().addFirst(new MapPropertySource("databaseUrl", properties));
    }

    /**
     * postgresql://usuario:clave@host:puerto/base?sslmode=require como URL de
     * JDBC, usuario y clave. Sin sslmode, require: la base esta en internet.
     * El resto de los parametros (channel_binding, por ejemplo) se descartan.
     */
    static JdbcTarget parse(String databaseUrl) {
        URI uri = URI.create(databaseUrl.trim());
        String scheme = uri.getScheme();
        if (!"postgresql".equals(scheme) && !"postgres".equals(scheme)) {
            throw new IllegalArgumentException("DATABASE_URL tiene que empezar con postgresql://");
        }
        String userInfo = uri.getRawUserInfo();
        if (userInfo == null || uri.getHost() == null) {
            throw new IllegalArgumentException("DATABASE_URL tiene que tener usuario, clave y host");
        }
        int colon = userInfo.indexOf(':');
        String username = decode(colon < 0 ? userInfo : userInfo.substring(0, colon));
        String password = colon < 0 ? "" : decode(userInfo.substring(colon + 1));
        int port = uri.getPort() < 0 ? 5432 : uri.getPort();
        String path = uri.getPath() == null ? "" : uri.getPath().replaceFirst("^/", "");
        String database = path.isEmpty() ? "postgres" : path;
        String sslmode = "require";
        if (uri.getRawQuery() != null) {
            for (String pair : uri.getRawQuery().split("&")) {
                if (pair.startsWith("sslmode=")) {
                    sslmode = decode(pair.substring("sslmode=".length()));
                }
            }
        }
        String url = "jdbc:postgresql://" + uri.getHost() + ":" + port + "/" + database + "?sslmode=" + sslmode;
        return new JdbcTarget(url, username, password);
    }

    private static String decode(String value) {
        return URLDecoder.decode(value.replace("+", "%2B"), StandardCharsets.UTF_8);
    }

    /** Despues de leer application.yml; con addFirst, DATABASE_URL gana sobre las DB_*. */
    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;
    }
}
