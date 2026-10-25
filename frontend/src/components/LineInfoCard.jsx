import LineBadge from './LineBadge.jsx'
import { connectingLineCodes, lineSummary } from '../utils/map.js'
import './LineInfoCard.css'

const CURRENT_YEAR = new Date().getFullYear()

function Row({ label, children }) {
  return (
    <div className="info-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

/**
 * Recuadro con la informacion de la linea, debajo del minimapa: empresa
 * operadora, ferrocarril de origen, inauguracion, recorrido, cantidad de
 * estaciones y combinaciones. Muestra solo los datos disponibles.
 */
export default function LineInfoCard({ line, stations, allLines = [] }) {
  const summary = stations.length > 0 ? lineSummary(stations) : null
  const connections = line.mode === 'SUBTE' ? connectingLineCodes(line.code) : []
  const linesByCode = new Map(allLines.filter((l) => l.mode === 'SUBTE').map((l) => [l.code, l]))

  return (
    <section className="line-info" style={{ '--line-color': line.colorHex }} aria-label="Información de la línea">
      <h2 className="line-info-title">Sobre la línea</h2>

      <dl className="info-rows">
        {line.operator && (
          <Row label="Opera">
            <strong>{line.operator}</strong>
            {line.operatorType && <span className="info-sub">{line.operatorType}</span>}
          </Row>
        )}

        {line.historicName && <Row label="Ferrocarril">{line.historicName}</Row>}

        {line.openedYear && (
          <Row label="Inaugurada">
            <span>
              {line.openedYear} <span className="info-sub">({CURRENT_YEAR - line.openedYear} años)</span>
            </span>
          </Row>
        )}

        {summary && (
          <Row label="Recorrido">
            {summary.branches.map((b) => (
              <span className="info-branch" key={`${b.from}-${b.to}`}>
                {b.from} ↔ {b.to}
                <span className="info-sub inline"> · ≈ {Math.round(b.km)} km</span>
              </span>
            ))}
          </Row>
        )}

        {summary && <Row label="Estaciones">{summary.stationCount}</Row>}

        {connections.length > 0 && (
          <Row label="Combina con">
            <span className="info-badges">
              {connections.map((code) =>
                linesByCode.has(code) ? (
                  <LineBadge key={code} line={linesByCode.get(code)} size="sm" />
                ) : (
                  <span key={code}>{code}</span>
                ),
              )}
            </span>
          </Row>
        )}
      </dl>

      {summary && <p className="info-note">Distancias aproximadas, medidas en línea recta entre estaciones.</p>}
    </section>
  )
}
