import { useId } from 'react'
import './NoData.css'

/**
 * "Datos no disponibles en este momento.", con la nube tachada gris: la
 * fuente no respondio (no es que no haya trenes o colectivos). Sin el
 * triangulo de advertencia: lo que falla es el dato, no el servicio.
 */
export default function NoData({ className = '', as: Tag = 'div' }) {
  return (
    <Tag className={`${className} no-data`.trim()}>
      <CloudOffIcon />
      Datos no disponibles en este momento.
    </Tag>
  )
}

/** Nube tachada. El corte alrededor de la raya es una mascara, asi sirve sobre cualquier fondo. */
function CloudOffIcon() {
  const mask = useId()
  return (
    <svg className="no-data-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <mask id={mask}>
        <rect width="24" height="24" fill="#fff" />
        <path d="M4 4l16 16" stroke="#000" strokeWidth="5" />
      </mask>
      <path mask={`url(#${mask})`} d="M7.5 18.5h9.2a3.8 3.8 0 0 0 .5-7.57A5.6 5.6 0 0 0 6.4 9.6a4.5 4.5 0 0 0 1.1 8.9z" />
      <path d="M4 4l16 16" />
    </svg>
  )
}
