package com.batransit.api.cuentas;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface PasswordResetRepository extends JpaRepository<PasswordReset, Long> {

    Optional<PasswordReset> findByTokenHash(String tokenHash);

    /** Los links sin usar de una cuenta (para anularlos al cambiar la contrasena). */
    List<PasswordReset> findByUserIdAndUsedAtIsNull(Long userId);

    /** Cuantos links se pidieron para una cuenta desde una fecha (freno de pedidos). */
    long countByUserIdAndCreatedAtAfter(Long userId, Instant since);
}
