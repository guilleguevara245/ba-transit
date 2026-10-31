import './ExternalTitle.css'

/**
 * Titulo de un enlace a otro sitio con su icono al final, pegado a la
 * ultima palabra (asi el icono nunca queda solo en un renglon).
 */
export default function ExternalTitle({ text }) {
  const clean = String(text ?? '').trim()
  const cut = clean.lastIndexOf(' ')
  const head = cut < 0 ? '' : clean.slice(0, cut + 1)
  const last = cut < 0 ? clean : clean.slice(cut + 1)
  return (
    <>
      {head}
      <span className="external-tail">
        {last}
        <svg className="external-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
        </svg>
      </span>
      <span className="visually-hidden"> (se abre en otro sitio)</span>
    </>
  )
}
