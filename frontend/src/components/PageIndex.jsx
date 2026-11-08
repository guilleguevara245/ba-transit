import ModeIcon from './ModeIcon.jsx'

/**
 * Indice de una pagina larga (Acerca de, Privacidad), fijo a la izquierda
 * en computadora; en el celular no se muestra. items: [id, texto, icono?];
 * con icono, el item va como subseccion.
 */
export default function PageIndex({ items, label = 'En esta página' }) {
  return (
    <nav className="about-index" aria-label={label}>
      {items.map(([id, text, icon]) => (
        <a key={id} href={`#${id}`} className={icon ? 'about-index-sub' : undefined}>
          {icon && <ModeIcon mode={icon} size="sm" />}
          {text}
        </a>
      ))}
    </nav>
  )
}
