import './ModeIcon.css'

/** Trazos de cada icono (24x24, linea de 1.9). */
const PATHS = {
  TREN: 'M7 3h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM5 10h14M9 20l-2 2m8-2 2 2M8.5 13h.01m7 0h.01',
  SUBTE: 'M4 18V9a8 6 0 0 1 16 0v9M8 18v-5h8v5M2 18h20',
  PREMETRO: 'M5 7h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zM3 11h18M12 7V4M9 4h6M7 19l1-3m9 3-1-3',
  COLECTIVO: 'M6 3h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM4 11h16M8 21v-3m8 3v-3M7.5 14.5h.01m9 0h.01',
  AEROPUERTO: 'M2 13l9-2 4-8h2l-2 9 6 1 1 2-7 1-3 6h-2l1-7-9-2z',
  ACCESOS: 'M8 3 5 21m11-18 3 18M12 4v3m0 4v3m0 4v3',
  SUBE: 'M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zm-1 4h18M7 15h4',
  COMO_LLEGAR: 'M12 21s-6-5.6-6-10a6 6 0 1 1 12 0c0 4.4-6 10-6 10zm0-8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  ESTACIONAMIENTO: 'M5.5 11.5 7 7.5h10l1.5 4M4.5 11.5h15v5h-15zM7 16.5v2M17 16.5v2M7.5 14h.01M16.5 14h.01',
  CASA: 'M3 11.5 12 4l9 7.5M5.5 9.5V20h4.5v-5.5h4V20h4.5V9.5',
  TRABAJO: 'M4 8h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zm5 0V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13.5h18',
  LUGAR: 'M6 21V4m0 1h10.5l-2.5 4 2.5 4H6',
  CLIMA: 'M7 18.5h10a4 4 0 0 0 .4-7.98A6 6 0 0 0 5.9 9.6 4.5 4.5 0 0 0 7 18.5z',
  NOTICIAS: 'M5 4h11a1 1 0 0 1 1 1v14a1 1 0 0 0 1 1H6a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1zm12 5h2a1 1 0 0 1 1 1v8a2 2 0 0 1-2 2M8 8h5M8 12h5M8 16h3',
  CUENTA: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 8a7 7 0 0 1 14 0',
  ECOBICI: 'M5.5 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm13 0a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5.5 14.5 9 8h6l3.5 6.5M9 8l3 6.5h-1M14 5h2.5',
}

/**
 * Icono de un modo de transporte en un cuadro redondeado. Los colores
 * salen de --mode-icon-bg y --mode-icon-fg, que cambian con el tema.
 */
export default function ModeIcon({ mode, size = 'md' }) {
  const path = PATHS[mode]
  if (!path) return null
  return (
    <span className={`mode-icon mode-icon-${size}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <path d={path} />
      </svg>
    </span>
  )
}
