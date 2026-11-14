package com.batransit.api.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

import java.sql.Connection;
import java.sql.DriverManager;
import java.util.Map;

/**
 * Despues de que Flyway deja lista la base, si hay una base anterior
 * configurada (DATABASE_URL apunta a una base nueva y las DB_* siguen con la
 * vieja), le copia sus datos. Pasa antes de que arranquen las tareas
 * programadas, asi que nadie escribe en la base nueva durante la copia.
 *
 * Si la copia falla (por ejemplo, la base vieja ya no responde) el sitio
 * arranca igual con la base nueva y se vuelve a intentar en el proximo
 * arranque; ya hecha, no se repite.
 */
@Configuration
public class DatabaseMoveConfig {

    private static final Logger log = LoggerFactory.getLogger(DatabaseMoveConfig.class);

    @Bean
    FlywayMigrationStrategy migrateAndCopyPreviousDatabase(Environment environment) {
        return flyway -> {
            flyway.migrate();
            String previousUrl = environment.getProperty(DatabaseUrlEnvironmentPostProcessor.PREVIOUS_URL);
            if (previousUrl == null) {
                return;
            }
            try (Connection target = flyway.getConfiguration().getDataSource().getConnection();
                 Connection source = DriverManager.getConnection(previousUrl,
                         environment.getProperty(DatabaseUrlEnvironmentPostProcessor.PREVIOUS_USER),
                         environment.getProperty(DatabaseUrlEnvironmentPostProcessor.PREVIOUS_PASSWORD))) {
                source.setReadOnly(true);
                Map<String, Integer> copied = DatabaseCopier.copyIfNeeded(target, source);
                if (copied.isEmpty()) {
                    log.info("Base nueva: los datos de la anterior ya se habian copiado");
                } else {
                    log.info("Base nueva: se copiaron los datos de la anterior ({})", DatabaseCopier.summary(copied));
                }
            } catch (Exception e) {
                log.error("Base nueva: no se pudieron copiar los datos de la anterior; se reintenta en el proximo"
                        + " arranque ({})", e.getMessage());
            }
        };
    }
}
