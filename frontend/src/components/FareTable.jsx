import { useState } from 'react'
import { formatCurrency } from '../utils/format.js'
import { JURISDICTION_LABELS, groupFares, tierLabel } from '../utils/fares.js'
import { MODE_LABELS_PLURAL } from '../constants.js'
import ModeIcon from './ModeIcon.jsx'
import './FareTable.css'

const TAB_LABELS = { NACIONAL: 'Nacionales', CABA: 'CABA', PROVINCIA: 'Provincia' }

const SOURCE_URL = 'https://www.argentina.gob.ar/redsube/tarifas-de-transporte-publico-amba'

const CABA_LINES = '4, 6, 7, 12, 23, 25, 26, 34, 39, 42, 44, 47, 50, 61, 62, 64, 65, 68, 76, 84, 90, 99, 102, 106, 107, 108, 109, 115, 118, 132 y 151'

const NOTES = {
  'COLECTIVO:NACIONAL': 'Líneas que cruzan entre la Ciudad y la Provincia (la General Paz o el Riachuelo).',
  'COLECTIVO:CABA': `Líneas que circulan solo dentro de la Ciudad: ${CABA_LINES}.`,
  'COLECTIVO:PROVINCIA': 'Líneas que circulan dentro de la provincia de Buenos Aires.',
  SUBTE: 'El precio baja según los viajes que hagas en el mes con la misma tarjeta registrada.',
  PREMETRO: 'Tarifa única para todo el recorrido.',
  TREN: 'Igual para todas las líneas; la sección depende de la distancia del viaje.',
}

const formatDate = (iso) => {
  if (!iso) return null
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function Table({ group }) {
  const anyUnregistered = group.rows.some((f) => f.priceUnregistered != null)
  return (
    <table className="fare-table">
      <thead>
        <tr>
          <th scope="col">{group.mode === 'SUBTE' ? 'Viajes en el mes' : 'Tramo'}</th>
          <th scope="col">Registrada</th>
          {anyUnregistered && <th scope="col">Sin registrar</th>}
        </tr>
      </thead>
      <tbody>
        {group.rows.map((fare) => (
          <tr key={fare.id}>
            <th scope="row">{tierLabel(fare)}</th>
            <td>{formatCurrency(fare.price)}</td>
            {anyUnregistered && (
              <td className="fare-unregistered">
                {fare.priceUnregistered != null ? formatCurrency(fare.priceUnregistered) : '—'}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Cuadro tarifario completo del AMBA, agrupado por modo y jurisdiccion. */
export default function FareTable({ fares }) {
  const groups = groupFares(fares)
  const busGroups = groups.filter((g) => g.mode === 'COLECTIVO')
  const otherGroups = groups.filter((g) => g.mode !== 'COLECTIVO')
  const [busKey, setBusKey] = useState(null)
  const bus = busGroups.find((g) => g.key === busKey) ?? busGroups[0]
  const since = fares?.map((f) => f.effectiveFrom).filter(Boolean).sort().at(-1)

  if (groups.length === 0) return null

  return (
    <section className="sube-card fare-card" id="tarifas">
      <h2 className="sube-heading">Cuadro tarifario</h2>
      <p className="sube-dim">
        {since ? `Vigente desde el ${formatDate(since)}. ` : ''}Precio por viaje con la SUBE registrada o sin registrar, sin descuentos Red SUBE ni Tarifa
        Social.
      </p>

      {bus && (
        <div className="fare-group">
          <h3 className="fare-group-title">
            <ModeIcon mode="COLECTIVO" size="sm" />
            {MODE_LABELS_PLURAL.COLECTIVO ?? 'Colectivos'}
          </h3>
          {busGroups.length > 1 && (
            <div className="fare-tabs" role="tablist" aria-label="Jurisdicción del colectivo">
              {busGroups.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  role="tab"
                  aria-selected={g.key === bus.key}
                  className={g.key === bus.key ? 'active' : ''}
                  onClick={() => setBusKey(g.key)}
                >
                  {TAB_LABELS[g.jurisdiction] ?? JURISDICTION_LABELS[g.jurisdiction] ?? g.jurisdiction}
                </button>
              ))}
            </div>
          )}
          <p className="fare-group-note">{NOTES[bus.key]}</p>
          <Table group={bus} />
        </div>
      )}

      {otherGroups.map((group) => (
        <div className="fare-group" key={group.key}>
          <h3 className="fare-group-title">
            <ModeIcon mode={group.mode} size="sm" />
            {MODE_LABELS_PLURAL[group.mode] ?? group.mode}
          </h3>
          {NOTES[group.key] && <p className="fare-group-note">{NOTES[group.key]}</p>}
          <Table group={group} />
        </div>
      ))}

      <p className="sube-source">
        Registrar la tarjeta es gratis y te da el precio más bajo. Fuente:{' '}
        <a href={SOURCE_URL} target="_blank" rel="noreferrer">
          Tarifas de transporte público del AMBA, Red SUBE ↗
        </a>
      </p>
    </section>
  )
}
