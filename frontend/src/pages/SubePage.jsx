import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import BackButton from '../components/BackButton.jsx'
import FaresPanel from '../components/FaresPanel.jsx'
import FareTable from '../components/FareTable.jsx'
import Select from '../components/Select.jsx'
import ModeIcon from '../components/ModeIcon.jsx'
import { useApi } from '../hooks/useApi.js'
import { MODE_LABELS } from '../constants.js'
import { formatCurrency } from '../utils/format.js'
import { basePrices } from '../utils/fares.js'
import { simulateRedSube } from '../utils/redSube.js'
import '../components/Panels.css'
import './ModePage.css'
import './AirportsPage.css'
import './SubePage.css'

const SIM_MODES = ['COLECTIVO', 'SUBTE', 'TREN', 'PREMETRO']
const MAP_URL = 'https://tarjetasube.sube.gob.ar/subeweb/WebForms/admin/views/mapa-sube.aspx'

function Simulator({ fares }) {
  const prices = useMemo(() => basePrices(fares), [fares])
  const available = SIM_MODES.filter((mode) => prices[mode] != null)
  const [trips, setTrips] = useState(['COLECTIVO', 'SUBTE'])
  const usable = trips.filter((mode) => prices[mode] != null)
  const result = simulateRedSube(usable.map((mode) => ({ mode, price: prices[mode] })))

  if (available.length === 0) return null

  return (
    <section className="sube-card">
      <h2 className="sube-heading">Simulá tu combinación</h2>
      <p className="sube-dim">
        Elegí los viajes en orden. Usa la tarifa base: colectivo nacional hasta 3 km, subte de 1 a 20 viajes en el mes
        y tren sección 1.
      </p>
      <ol className="sube-trips">
        {trips.map((mode, index) => (
          <li key={index}>
            <span className="sube-trip-number">{index + 1}</span>
            <Select
              className="sube-trip-select"
              label={`Viaje ${index + 1}`}
              value={mode}
              onChange={(value) => setTrips(trips.map((m, i) => (i === index ? value : m)))}
              options={available.map((m) => ({ value: m, label: MODE_LABELS[m] ?? m }))}
            />
            {result.detail[index] && (
              <span className="sube-trip-price">
                {formatCurrency(result.detail[index].paid)}
                <small>
                  {result.detail[index].excluded
                    ? 'sin descuento (subte después de tren)'
                    : result.detail[index].percent === 100
                      ? 'tarifa completa'
                      : `${100 - result.detail[index].percent}% de descuento`}
                </small>
              </span>
            )}
            {trips.length > 1 && (
              <button type="button" className="sube-remove" aria-label={`Quitar el viaje ${index + 1}`}
                onClick={() => setTrips(trips.filter((_, i) => i !== index))}>
                ×
              </button>
            )}
          </li>
        ))}
      </ol>
      {trips.length < 5 && (
        <button type="button" className="sube-add" onClick={() => setTrips([...trips, available[0]])}>
          + Agregar viaje
        </button>
      )}
      <div className="sube-total">
        <span>
          Pagás <strong>{formatCurrency(result.total)}</strong>
        </span>
        {result.full > result.total && (
          <span className="sube-saving">Ahorrás {formatCurrency(result.full - result.total)}</span>
        )}
      </div>
      <p className="sube-note">
        Orientativo: algunos colectivos (por ejemplo, los de jurisdicción provincial como segundo viaje) no tienen
        descuento, y las tarifas de colectivo y tren dependen de la distancia. Mirá el cuadro tarifario más abajo.
      </p>
    </section>
  )
}

/** SUBE: como funciona el descuento Red SUBE, simulador, tarifas y donde cargar. */
export default function SubePage() {
  const { data: fares } = useApi('/api/v1/fares')
  const { hash } = useLocation()

  // Desde el panel de inicio se llega con /sube#tarifas: el router no
  // baja solo hasta el ancla, y el cuadro aparece recien con los datos.
  useEffect(() => {
    if (hash === '#tarifas' && fares) {
      window.document.getElementById('tarifas')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [hash, fares])

  return (
    <div className="wrap content">
      <BackButton />
      <h1 className="page-title page-title-icon">
        <ModeIcon mode="SUBE" size="lg" />
        SUBE
      </h1>
      <p className="page-subtitle">Cómo funciona el descuento Red SUBE, tarifas y dónde cargar la tarjeta.</p>

      <div className="sube-layout">
        <div className="sube-main">
          <section className="sube-card">
            <h2 className="sube-heading">Cómo funciona Red SUBE</h2>
            <p>
              Si combinás viajes dentro de las <strong>2 horas</strong> desde el primer pago, pagás menos en los
              siguientes:
            </p>
            <div className="sube-steps">
              <div>
                <strong>1er viaje</strong>
                <span>Tarifa completa</span>
              </div>
              <div>
                <strong>2do viaje</strong>
                <span>50% de descuento</span>
              </div>
              <div>
                <strong>3ro al 5to</strong>
                <span>75% de descuento</span>
              </div>
            </div>
            <ul className="sube-list">
              <li>Tenés que pagar siempre con el mismo medio: la tarjeta SUBE registrada, SUBE Digital o el QR de la app.</li>
              <li>
                Desde agosto de 2026, el <strong>subte después de un tren</strong> se paga completo, y los colectivos
                provinciales no tienen descuento como segundo viaje.
              </li>
              <li>Si empezás en subte, el tren o colectivo que tomes después tiene 50% de descuento.</li>
              <li>Los descuentos se suman a la Tarifa Social Federal.</li>
            </ul>
            <p className="sube-source">
              Fuentes:{' '}
              <a href="https://www.argentina.gob.ar/redsube/preguntasfrecuentes" target="_blank" rel="noreferrer">
                Preguntas frecuentes de Red SUBE ↗
              </a>{' '}
              ·{' '}
              <a
                href="https://www.infobae.com/economia/2026/08/10/red-sube-deja-de-funcionar-un-descuento-para-los-usuarios-que-combinan-trenes-y-subte/"
                target="_blank"
                rel="noreferrer"
              >
                Infobae, 10/08/2026 ↗
              </a>
            </p>
          </section>

          <Simulator fares={fares} />

          {fares && <FareTable fares={fares} />}

          <section className="sube-card">
            <h2 className="sube-heading">Dónde cargar y hacer trámites</h2>
            <div className="sube-links">
              <a href={`${MAP_URL}?id=1`} target="_blank" rel="noreferrer">
                <strong>Puntos de carga</strong>
                <span>Kioscos y comercios donde cargar saldo ↗</span>
              </a>
              <a href={`${MAP_URL}?id=3`} target="_blank" rel="noreferrer">
                <strong>Centros de atención</strong>
                <span>Registrar, reemplazar o bloquear la tarjeta ↗</span>
              </a>
              <a href={`${MAP_URL}?id=1`} target="_blank" rel="noreferrer">
                <strong>Terminales automáticas</strong>
                <span>Acreditar cargas hechas online (filtro en el mapa oficial) ↗</span>
              </a>
            </div>
            <p className="sube-dim">En el mapa oficial elegí la provincia de Buenos Aires para ver los puntos cercanos.</p>
          </section>

          <section className="sube-card">
            <h2 className="sube-heading">¿Algo no funciona?</h2>
            <p>
              No hay una fuente pública con el estado del sistema SUBE en tiempo real. Si tu tarjeta o un lector fallan,
              reportalo en los canales oficiales:
            </p>
            <ul className="sube-list">
              <li>
                <a href="https://www.argentina.gob.ar/sube" target="_blank" rel="noreferrer">
                  argentina.gob.ar/sube ↗
                </a>{' '}
                — consultas, registro de la tarjeta y saldo.
              </li>
              <li>
                <a href="https://tarjetasube.sube.gob.ar/" target="_blank" rel="noreferrer">
                  Mi SUBE ↗
                </a>{' '}
                — movimientos, cargas pendientes y bloqueo de la tarjeta.
              </li>
            </ul>
          </section>
        </div>

        <aside className="sube-side">{fares && <FaresPanel fares={fares} showMore={false} />}</aside>
      </div>
    </div>
  )
}
