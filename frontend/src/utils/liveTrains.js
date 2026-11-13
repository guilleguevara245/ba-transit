import { formatRelativeTime } from './format.js'

/** Hace cuanto se pidio la posicion: "hace 20 s", "hace 2 min". */
export function positionAge(iso, now) {
  if (!iso) return null
  const seconds = Math.round((now.getTime() - new Date(iso).getTime()) / 1000)
  if (seconds < 10) return 'recién'
  if (seconds < 60) return `hace ${seconds} s`
  return formatRelativeTime(iso, now)
}

/** Hace cuanto, en segundos: "recién", "hace 40 s", "hace 3 min" (la posicion de un colectivo). */
export function secondsAgoText(seconds) {
  if (seconds == null) return null
  if (seconds < 10) return 'recién'
  if (seconds < 60) return `hace ${Math.round(seconds)} s`
  return `hace ${Math.round(seconds / 60)} min`
}

/** "Retiro-Cabred" pasa a "Retiro - Cabred". */
export function branchName(branch) {
  return branch.replace(/\s*-\s*/g, ' - ')
}

/** "5 trenes en vivo" / "1 tren en vivo" (como "10 colectivos en vivo"). */
export function trainsMovingLabel(count) {
  return count === 1 ? '1 tren en vivo' : `${count.toLocaleString('es-AR')} trenes en vivo`
}
