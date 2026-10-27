import { festiveFor } from '../utils/festive.js'

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

/** Adornos de fechas especiales sobre el cuadrado del logo (ver utils/festive.js). */
const DECORATIONS = {
  // Gorro de Navidad apoyado sobre las flechas, con la punta caida a la derecha.
  gorro: (
    <svg className="brand-deco brand-deco-gorro" viewBox="0 0 34 26" aria-hidden="true" focusable="false">
      <path d="M4 19 C 7 8, 14 3, 22 4 C 27 5, 31 9, 31 15 L 27 19 Z" fill="#d62828" />
      <rect x="2" y="17" width="27" height="6.5" rx="3.2" fill="#ffffff" />
      <circle cx="30.5" cy="16" r="3.4" fill="#ffffff" />
    </svg>
  ),
  // Escarapela en la esquina: celeste, blanco y celeste.
  escarapela: (
    <svg className="brand-deco brand-deco-escarapela" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="11.5" fill="#6cace4" stroke="#0c0c0d" strokeWidth="1" />
      <circle cx="12" cy="12" r="7.8" fill="#ffffff" />
      <circle cx="12" cy="12" r="4.2" fill="#6cace4" />
    </svg>
  ),
  // Confeti alrededor de la esquina (Año Nuevo, carnaval).
  confeti: (
    <svg className="brand-deco brand-deco-confeti" viewBox="0 0 30 30" aria-hidden="true" focusable="false">
      <rect x="4" y="6" width="4" height="2.4" rx="1" fill="#f4c11b" transform="rotate(-30 6 7)" />
      <rect x="14" y="2" width="4" height="2.4" rx="1" fill="#6cace4" transform="rotate(25 16 3)" />
      <rect x="22" y="9" width="4" height="2.4" rx="1" fill="#e4572e" transform="rotate(-15 24 10)" />
      <rect x="11" y="13" width="3.4" height="2" rx="1" fill="#ffffff" transform="rotate(40 12 14)" />
      <rect x="24" y="19" width="3.4" height="2" rx="1" fill="#f4c11b" transform="rotate(10 25 20)" />
      <circle cx="20" cy="15" r="1.4" fill="#e4572e" />
      <circle cx="7" cy="16" r="1.2" fill="#6cace4" />
    </svg>
  ),
}

export default function Logo() {
  const decoration = DECORATIONS[festiveFor().decoration]
  return (
    <>
      <span className="brand-mark-wrap">
        <LogoMark className="brand-mark" />
        {decoration}
      </span>
      <span className="brand-text">
        <b>BA</b> <span>TRANSIT</span>
      </span>
    </>
  )
}
