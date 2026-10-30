import ModeIcon from './ModeIcon.jsx'
import { PLACE_TYPES } from '../utils/placesStore.js'

/** Icono de un lugar guardado (Casa, Trabajo u otro), con los trazos del sitio. */
export default function PlaceIcon({ tipo, size = 'md' }) {
  return <ModeIcon mode={(PLACE_TYPES[tipo] ?? PLACE_TYPES.otro).icon} size={size} />
}
