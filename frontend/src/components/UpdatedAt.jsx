import { useEffect, useRef, useState } from 'react'
import { updatedLabel } from '../utils/format.js'
import './UpdatedAt.css'

/**
 * "Actualizado a las 23:31 · Actualizar": la hora del dato y un boton para
 * pedirlo de nuevo sin recargar la pagina. verb: "Actualizado", "Medido"...
 * Tras actualizar a mano dice "Al día" un momento, aunque la fuente todavia
 * no tenga un dato mas nuevo (asi se nota que el boton anduvo).
 */
export default function UpdatedAt({ at, onRefresh, refreshing = false, verb = 'Actualizado', className = '' }) {
  const [confirmed, setConfirmed] = useState(false)
  const asked = useRef(false)
  const label = at ? updatedLabel(at) : null

  useEffect(() => {
    if (refreshing || !asked.current) return undefined
    asked.current = false
    setConfirmed(true)
    const timer = setTimeout(() => setConfirmed(false), 2500)
    return () => clearTimeout(timer)
  }, [refreshing])

  return (
    <span className={`updated-at ${className}`}>
      {label && (
        <span>
          {verb} {label}
        </span>
      )}
      {onRefresh && (
        <>
          {label && <span aria-hidden="true"> · </span>}
          <button
            type="button"
            className={refreshing ? 'updated-at-button spinning' : 'updated-at-button'}
            onClick={() => {
              asked.current = true
              onRefresh()
            }}
            disabled={refreshing}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8m0-4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16m0 4v-4h-4" />
            </svg>
            {refreshing ? 'Actualizando…' : confirmed ? 'Al día' : 'Actualizar'}
          </button>
        </>
      )}
    </span>
  )
}
