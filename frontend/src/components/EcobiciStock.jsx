import { stockLevel } from '../utils/ecobici.js'
import './EcobiciStock.css'

/** Bici (el mismo trazo de EcoBici) y anclaje (un soporte de bicis). */
const GLYPHS = {
  bikes:
    'M5.5 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm13 0a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5.5 14.5 9 8h6l3.5 6.5M9 8l3 6.5h-1M14 5h2.5',
  docks: 'M7 20V10a5 5 0 0 1 10 0v10M3.5 20h17M12 5v3',
}

const LABELS = {
  bikes: ['bici disponible', 'bicis disponibles'],
  docks: ['anclaje libre', 'anclajes libres'],
}

/** Cuanto se corre cada bici de un grupo hacia atras (de 24): quedan juntitas, una detras de otra. */
const BIKE_STEP = { x: 8, y: 4 }

/**
 * Las bicis de un grupo en un solo dibujo, una detras de otra: las de
 * atras mas arriba y mas claras, y cada una con un borde del color de la
 * tarjeta para que no se mezclen las ruedas.
 */
function BikeGroup({ count }) {
  const width = 24 + (count - 1) * BIKE_STEP.x
  const height = 24 + (count - 1) * BIKE_STEP.y
  return (
    <svg
      className="ecobici-stock-group"
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: (22 * width) / 24, height: (22 * height) / 24 }}
      focusable="false"
    >
      {Array.from({ length: count }, (_, i) => {
        // i = 0 es la de mas atras: se dibuja primero.
        const back = count - 1 - i
        return (
          <g
            key={i}
            transform={`translate(${back * BIKE_STEP.x} ${(count - 1 - back) * BIKE_STEP.y})`}
            opacity={back === 0 ? 1 : back === 1 ? 0.7 : 0.45}
          >
            <path className="ecobici-stock-halo" d={GLYPHS.bikes} />
            <path className="ecobici-stock-glyph" d={GLYPHS.bikes} />
          </g>
        )
      })}
    </svg>
  )
}

/** El numero con sus dibujos: tres en verde (de sobra), dos en amarillo (pocas), uno en rojo o tachado. */
function Stock({ kind, count }) {
  const level = stockLevel(count, kind)
  return (
    <div className={`ecobici-stock ecobici-stock-${level.key}`}>
      <div className="ecobici-stock-row">
        <strong>{count}</strong>
        <span className="ecobici-stock-glyphs" aria-hidden="true">
          {kind === 'bikes' && level.glyphs > 1 ? (
            <BikeGroup count={level.glyphs} />
          ) : (
            Array.from({ length: level.glyphs }, (_, i) => (
              <svg key={i} viewBox="0 0 24 24" focusable="false">
                <path className="ecobici-stock-glyph" d={GLYPHS[kind]} />
                {level.key === 'none' && <path className="ecobici-stock-x" d="M5 5l14 14M19 5 5 19" />}
              </svg>
            ))
          )}
        </span>
      </div>
      <span className="ecobici-stock-label">{LABELS[kind][count === 1 ? 0 : 1]}</span>
    </div>
  )
}

/**
 * Bicis y anclajes libres en la tarjeta de una estacion, con dibujos que
 * cambian segun cuantos quedan y, si queda uno o ninguno, el aviso abajo.
 */
export default function EcobiciStock({ bikes, docks }) {
  const notes = [stockLevel(bikes, 'bikes'), stockLevel(docks, 'docks')].filter((l) => l.note)
  return (
    <>
      <div className="map-card-stats">
        <Stock kind="bikes" count={bikes} />
        <Stock kind="docks" count={docks} />
      </div>
      {notes.length > 0 && (
        <ul className="ecobici-stock-notes">
          {notes.map((l) => (
            <li key={l.note} className={`ecobici-stock-${l.key}`}>
              {l.note}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
