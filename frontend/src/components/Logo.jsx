/**
 * Logo de BA Transit: el cuadrado amarillo con tres chevrones y el
 * nombre ("BA" en negrita, "TRANSIT" normal). Es un SVG en linea en vez
 * de una imagen para que se vea nitido en cualquier pantalla y tome los
 * colores del tema.
 */
export function LogoMark({ className }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="6" fill="var(--yellow)" />
      <g fill="var(--bg)">
        <polygon points="9,15 17,15 28,32 17,49 9,49 20,32" />
        <polygon points="23,15 31,15 42,32 31,49 23,49 34,32" />
        <polygon points="37,15 45,15 56,32 45,49 37,49 48,32" />
      </g>
    </svg>
  )
}

export default function Logo() {
  return (
    <>
      <LogoMark className="brand-mark" />
      <span className="brand-text">
        <b>BA</b> <span>TRANSIT</span>
      </span>
    </>
  )
}
