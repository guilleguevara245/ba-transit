/**
 * Cuando se confirmo por ultima vez que cada dato cargado a mano sigue
 * vigente (no cuando empezo a regir). Al revisar o actualizar uno, cambiar
 * su fecha aca: si pasan mas de STALE_AFTER_DAYS, el sitio avisa que puede
 * haber cambiado. La revision semanal (tarea programada) avisa si la fuente
 * oficial cambio.
 */
export const DATA_CHECKED = {
  tarifas: '2026-10-26',
  peajes: '2026-10-26',
  urquiza: '2026-10-26',
}

/** Unos 4 meses. */
export const STALE_AFTER_DAYS = 120
