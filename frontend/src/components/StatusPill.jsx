import { useFlash } from '../hooks/useFlash.js'

/**
 * Etiqueta de estado con su punto ("Normal", "Demoras"). Si el estado
 * cambia mientras se mira la pagina, parpadea una vez para que se note.
 * tone: la clase del estado (status-normal, status-delayed...).
 */
export default function StatusPill({ tone, children, title }) {
  const flash = useFlash(tone)
  return (
    <span key={flash} className={`status-pill ${tone}${flash ? ' status-flash' : ''}`} title={title}>
      <span className="dot"></span>
      {children}
    </span>
  )
}
