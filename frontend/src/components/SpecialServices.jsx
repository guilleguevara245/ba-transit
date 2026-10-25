import { useState } from 'react'
import { Link } from 'react-router-dom'
import LineBadge from './LineBadge.jsx'
import { useApi } from '../hooks/useApi.js'
import { formatLongDate } from '../utils/format.js'
import './SpecialServices.css'

const REFRESH_MS = 10 * 60_000
/** En el inicio se muestran los primeros; el resto, con un boton. */
const COLLAPSED_COUNT = 3

const KIND_LABELS = { ESPECIAL: 'Servicio especial', CAMBIO: 'Cambio en el servicio' }

/**
 * Servicios especiales y cambios en el servicio vigentes hoy (trenes
 * rapidos, recorridos limitados por obras, estaciones cerradas). Sin lineId muestra los de todas las lineas, con enlace a
 * cada una. Si no hay ninguno (o falla el pedido) no muestra nada.
 */
export default function SpecialServices({ lineId }) {
  const path = lineId ? `/api/v1/servicios-especiales?lineId=${lineId}` : '/api/v1/servicios-especiales'
  const { data } = useApi(path, { refreshMs: REFRESH_MS })
  const [expanded, setExpanded] = useState(false)
  if (!data || data.length === 0) return null

  const visible = expanded || lineId ? data : data.slice(0, COLLAPSED_COUNT)
  const hidden = data.length - visible.length

  return (
    <section className="special-services" aria-label="Servicios especiales">
      <div className="special-title">
        <span>Servicios especiales y cambios</span>
        <span className="special-count">{data.length === 1 ? '1 vigente' : `${data.length} vigentes`}</span>
      </div>
      <ul className="special-list">
        {visible.map((s) => {
          const line = { mode: s.lineMode, code: s.lineCode, name: s.lineName, colorHex: s.lineColorHex }
          return (
            <li className="special-item" key={s.id}>
              {!lineId && <LineBadge line={line} size="sm" />}
              <div className="special-body">
                <div className="special-head">
                  <span className={`special-tag special-tag-${(s.kind ?? 'ESPECIAL').toLowerCase()}`}>
                    {KIND_LABELS[s.kind] ?? KIND_LABELS.ESPECIAL}
                  </span>
                  <strong>{s.title}</strong>
                  {!lineId && (
                    <Link className="special-line" to={`/lineas/${s.lineId}`}>
                      {s.lineName}
                    </Link>
                  )}
                </div>
                {s.description && <p className="special-desc">{s.description}</p>}
                <div className="special-when">
                  {[s.days, s.schedule].filter(Boolean).join(' · ')}
                  {s.validUntil && <span>{s.days || s.schedule ? ' · ' : ''}Hasta el {formatLongDate(s.validUntil)}</span>}
                  {s.url && (
                    <a className="special-more" href={s.url} target="_blank" rel="noreferrer">
                      Más información ↗
                    </a>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      {hidden > 0 && (
        <button type="button" className="special-expand" onClick={() => setExpanded(true)}>
          Ver {hidden === 1 ? 'el otro' : `los ${hidden} restantes`}
        </button>
      )}
    </section>
  )
}
