import './TripIcon.css'

/** Trazos (24x24) de Como llegar: a pie, esperar, invertir, direccion y aviso. */
const PATHS = {
  walk: 'M13.5 5.5a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5zM9 21l2.2-6.2M12.6 8 11.2 14.8l3.3 2.4.9 3.8M7.5 12.2 9 8.6 12.6 8l2.6 3.2 2.6.9',
  wait: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4.5V12l3 2',
  swap: 'M8 4v16M8 4 4.5 7.5M8 4l3.5 3.5M16 20V4m0 16-3.5-3.5M16 20l3.5-3.5',
  pin: 'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 8v5m0-8h.01',
}

export default function TripIcon({ name, className = '' }) {
  return (
    <svg className={`trip-icon ${className}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  )
}
