import LineBadge from './LineBadge.jsx'
import { connectingLineCodes, lineSummary } from '../utils/map.js'
import { DAY_TYPES, OPERATOR_SITES, serviceHoursFor } from '../utils/serviceHours.js'
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
  const hours = serviceHoursFor(line)
  const operatorSite = OPERATOR_SITES[line.operator]

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
        {!hours && operatorSite && (
          <Row label="Horarios">
            <a className="info-link" href={operatorSite} target="_blank" rel="noreferrer">
              Consultar en el sitio de {line.operator} ↗
            </a>
          </Row>
        )}
      </dl>

      {hours && (
        <div className="info-hours">
          <h3 className="info-hours-title">Horario de servicio</h3>
          <table className="hours-table">
            <thead>
              <tr>
                <th scope="col"></th>
                {DAY_TYPES.map((day) => (
                  <th scope="col" key={day}>
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Primer tren</th>
                {hours.firstTrain.map((time, i) => (
                  <td key={i}>{time}</td>
                ))}
              </tr>
              {hours.lastTrains.map((row) => (
                <tr key={row.from}>
                  <th scope="row">
                    Último desde <span className="hours-from">{row.from}</span>
                  </th>
                  {row.times.map((time, i) => (
                    <td key={i}>{time}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {hours.note && <p className="info-note">{hours.note}</p>}
          <p className="info-note">Últimos trenes ± 5 min. Fuente: Emova.</p>
        </div>
      )}

      {summary && <p className="info-note">Distancias aproximadas, medidas en línea recta entre estaciones.</p>}
    </section>
  )
}
