/**
 * La marca de una estacion con aviso, en lugar de su punto: cerrada, una
 * cruz roja; aviso positivo, una "i"; lo demas, el triangulo de precaucion.
 */
export default function NoticeMark({ kind, className = '' }) {
  return (
    <span className={`notice-mark notice-mark-${kind} ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        {kind === 'closed' && (
          <>
            <circle className="bg" cx="12" cy="12" r="10" />
            <path className="mark" d="M8.5 8.5l7 7m0-7-7 7" />
          </>
        )}
        {kind === 'info' && (
          <>
            <circle className="bg" cx="12" cy="12" r="10" />
            <path className="mark" d="M12 11v6M12 7.4v.1" />
          </>
        )}
        {kind === 'warning' && (
          <>
            <path className="bg" d="M10.3 3.2 1.6 18.3a2 2 0 0 0 1.7 3h17.4a2 2 0 0 0 1.7-3L13.7 3.2a2 2 0 0 0-3.4 0z" />
            <path className="mark" d="M12 9v5M12 17.2v.1" />
          </>
        )}
      </svg>
    </span>
  )
}
