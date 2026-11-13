import { formatRelativeTime } from './format.js'

/** Hace cuanto se pidio la posicion: "hace 20 s", "hace 2 min". */
export function positionAge(iso, now) {
  if (!iso) return null
  const seconds = Math.round((now.getTime() - new Date(iso).getTime()) / 1000)
  if (seconds < 10) return 'recién'
  if (seconds < 60) return `hace ${seconds} s`
  return formatRelativeTime(iso, now)
}

/** "Retiro-Cabred" pasa a "Retiro - Cabred". */
export function branchName(branch) {
  return branch.replace(/\s*-\s*/g, ' - ')
}

/** "5 en las vías ahora", como "9 en la calle ahora" de los colectivos. */
export function trainsMovingLabel(count) {
  return `${count.toLocaleString('es-AR')} en las vías ahora`
}
