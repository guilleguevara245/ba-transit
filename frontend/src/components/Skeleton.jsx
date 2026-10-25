import './Skeleton.css'

/**
 * Bloques grises animados con la forma del contenido que esta por
 * llegar, en lugar de un texto de "Cargando...". El texto queda para
 * lectores de pantalla.
 *
 * variant: "cards" (grilla de tarjetas), "list" (renglones), "map"
 * (rectangulo alto) o "block" (un bloque de ancho completo).
 */
export default function Skeleton({ variant = 'block', count = 3, label = 'Cargando…', className = '' }) {
  return (
    <div className={`skeleton skeleton-${variant} ${className}`} role="status" aria-busy="true">
      <span className="visually-hidden">{label}</span>
      {variant === 'cards' &&
        Array.from({ length: count }, (_, i) => (
          <div className="skeleton-card" key={i}>
            <div className="skeleton-line skeleton-title" />
            <div className="skeleton-line skeleton-pill" />
            <div className="skeleton-line skeleton-short" />
          </div>
        ))}
      {variant === 'list' &&
        Array.from({ length: count }, (_, i) => (
          <div className="skeleton-row" key={i}>
            <div className="skeleton-dot" />
            <div className="skeleton-line" style={{ width: `${55 + ((i * 17) % 35)}%` }} />
          </div>
        ))}
      {(variant === 'map' || variant === 'block') && <div className="skeleton-fill" />}
    </div>
  )
}
