import { MODE_LABELS } from '../constants.js'

/**
 * Texto de una tarifa segun su tramo (ver Fare en el backend):
 * sin km es tarifa plana, solo minKm es "mas de X km", ambos es un rango.
 */
export function fareLabel(fare) {
  const modeLabel = MODE_LABELS[fare.mode] ?? fare.mode

  if (fare.minKm == null && fare.maxKm == null) {
    return `${modeLabel}, tarifa plana`
  }
  if (fare.maxKm == null) {
    return `${modeLabel}, más de ${Number(fare.minKm)} km`
  }
  return `${modeLabel}, ${Number(fare.minKm)}-${Number(fare.maxKm)} km`
}
