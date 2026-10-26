import { FILLED, GLYPHS } from '../utils/mapIcons.js'

/** El distintivo de un mapa como elemento de React (para las referencias y listas). */
export default function MapBadge({ glyph, bg, fg, border = 'transparent', shape = 'circle', className = 'legend-badge' }) {
  return (
    <span className={className} aria-hidden="true">
      <span className={`map-badge map-badge-${shape}${FILLED.has(glyph) ? ' map-badge-filled' : ''}`} style={{ background: bg, color: fg, borderColor: border }}>
        <svg viewBox="0 0 24 24" focusable="false">
          <path d={GLYPHS[glyph]} />
        </svg>
      </span>
    </span>
  )
}
