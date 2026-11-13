import LineBadge from './LineBadge.jsx'
import MapCard from './MapCard.jsx'
import { ServiceIcon } from './NextTrains.jsx'
import { useNow } from '../hooks/useNow.js'
import { readableTextColor } from '../utils/color.js'
import { branchName, positionAge } from '../utils/liveTrains.js'
import { shortOperator } from '../utils/map.js'
import { MODE_PATHS } from '../utils/modePaths.js'
import { serviceKind } from '../utils/nextTrains.js'
import './LiveTrainCard.css'

/** El dibujo del modo (tren, subte o Premetro) en un circulo del color de la linea, como el de estacion. */
export function TrainIcon({ mode, color, size = 30 }) {
  return (
    <span
      className="station-icon"
      style={{ width: size, height: size, background: color, color: readableTextColor(color) }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" focusable="false">
        <path d={MODE_PATHS[mode] ?? MODE_PATHS.TREN} />
      </svg>
    </span>
  )
}

/**
 * Debajo del mapa: que es el circulo de los trenes (con el GPS de cada
 * tren o estimado con los horarios), con el mismo dibujo que en el mapa.
 */
export function LiveTrainsLegend({ line, estimated }) {
  const color = line?.colorHex ?? '#17171a'
  const ink = readableTextColor(color) === '#ffffff' ? color : '#17171a'
  return (
    <p className="live-trains-legend">
      <span className={estimated ? 'live-train estimated' : 'live-train'} aria-hidden="true">
        <span style={{ '--train-color': color, '--train-ink': ink }}>
          <svg viewBox="0 0 24 24" focusable="false">
            <path d={MODE_PATHS[line?.mode] ?? MODE_PATHS.TREN} />
          </svg>
        </span>
      </span>
      <span>
        {estimated
          ? 'Trenes andando, en una posición estimada con los horarios en vivo.'
          : 'Trenes andando, con el GPS de cada tren.'}{' '}
        Tocá uno para ver hacia dónde va.
      </span>
    </p>
  )
}

/** Mira de GPS (posicion del tren) y reloj punteado (posicion estimada). */
function SourceIcon({ estimated }) {
  return (
    <svg className="live-train-source-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {estimated ? (
        <>
          <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
          <path d="M12 7v5l3 2" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="2.2" className="fill" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </>
      )}
    </svg>
  )
}

/**
 * La proxima parada o estacion destacada, con los minutos que faltan en una
 * pastilla del color de la linea ("llegando" con 0). Lo usan las tarjetas
 * del tren y del colectivo en vivo.
 */
export function NextStop({ label, name, minutes, color }) {
  const ink = color ? readableTextColor(color) : undefined
  return (
    <div className="live-train-next">
      <div>
        <span className="live-train-next-label">{label}</span>
        <strong>{name}</strong>
      </div>
      {minutes != null && (
        <span className="live-train-mins" style={color ? { background: color, color: ink } : undefined}>
          {minutes === 0 ? 'llegando' : `${minutes} min`}
        </span>
      )}
    </div>
  )
}

/** Al pie: de donde sale la posicion (GPS o estimada) y hace cuanto. */
export function PositionSource({ estimated = false, text, age }) {
  return (
    <div className="live-train-source">
      <SourceIcon estimated={estimated} />
      {text}
      {age && (
        <>
          <span className="station-popup-dot">·</span>
          {age}
        </>
      )}
    </div>
  )
}

/**
 * Tarjeta de un tren andando en el mapa, con el mismo formato que la de
 * una estacion: la linea, hacia donde va, la proxima estacion con los
 * minutos que le faltan, el tipo de servicio y el ramal, y de donde sale
 * la posicion (el GPS del tren o una estimacion con los horarios).
 */
export default function LiveTrainCard({ train, line, estimated, updatedAt }) {
  const now = useNow(10_000)
  const color = line?.colorHex
  const subway = line?.mode === 'SUBTE' || line?.mode === 'PREMETRO'
  const operator = shortOperator(line?.operator)
  const minutes = train.minutesToNext
  const age = positionAge(updatedAt, now)

  return (
    <MapCard
      color={color}
      minWidth={240}
      badge={
        // Como en la tarjeta de estacion: "Linea [B]" en el subte y el Premetro; en los trenes, el nombre.
        subway && line ? (
          <>
            Línea
            <LineBadge line={line} size="sm" />
          </>
        ) : (
          (line?.name ?? 'Tren')
        )
      }
      kicker={
        operator && (
          <>
            <span className="station-popup-dot">·</span>
            <span className="station-popup-operator">{operator}</span>
          </>
        )
      }
      icon={<TrainIcon mode={line?.mode} color={color} />}
      title={train.destination ? `Hacia ${train.destination}` : 'Tren en servicio'}
    >
      {train.nextStation && (
        <NextStop label="Próxima estación" name={train.nextStation} minutes={minutes} color={color} />
      )}
      {(train.service || train.branch) && (
        <div className="live-train-service" style={color ? { '--line-color': color } : undefined}>
          {train.service && (
            <span>
              <ServiceIcon name={train.service} />
              {train.service}
              {serviceKind(train.service) === 'especial' && <span className="live-train-dim"> (tren agregado)</span>}
            </span>
          )}
          {train.service && train.branch && <span className="station-popup-dot">·</span>}
          {train.branch && <span>Ramal {branchName(train.branch)}</span>}
        </div>
      )}
      <PositionSource
        estimated={estimated}
        text={estimated ? 'Posición estimada con los horarios' : 'GPS del tren'}
        age={age}
      />
    </MapCard>
  )
}
