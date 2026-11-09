import './SpeedGauge.css'

/** Medio circulo de 0 a 100% (centro en 18,20; radio 13). */
const ARC = 'M5 20a13 13 0 0 1 26 0'
const ARC_LENGTH = Math.PI * 13

/**
 * Velocimetro chico para las tarjetas de los accesos: el arco lleno hasta
 * el porcentaje de la velocidad normal al que se circula, en el color del
 * estado, con la aguja en ese punto.
 */
export default function SpeedGauge({ percent, color, size = 34 }) {
  const p = Math.max(0, Math.min(100, percent ?? 0)) / 100
  const angle = Math.PI * (1 - p)
  const needle = [18 + 9 * Math.cos(angle), 20 - 9 * Math.sin(angle)].map((n) => n.toFixed(2))
  // Al aparecer, la aguja sube desde el cero (girando desde la izquierda) y el arco se llena.
  const needleFrom = `${(-180 * p).toFixed(1)}deg`
  return (
    <span
      className="speed-gauge"
      style={{ width: size, height: size, '--status-color': color, '--needle-from': needleFrom }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 36 26" focusable="false">
        <path className="speed-gauge-track" d={ARC} />
        <path className="speed-gauge-fill" d={ARC} strokeDasharray={`${(ARC_LENGTH * p).toFixed(2)} ${ARC_LENGTH}`} />
        <path className="speed-gauge-needle" d={`M18 20L${needle[0]} ${needle[1]}`} />
        <circle cx="18" cy="20" r="2" />
      </svg>
    </span>
  )
}
