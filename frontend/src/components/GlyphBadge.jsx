import { FILLED, GLYPHS } from '../utils/mapIcons.js'

/**
 * El mismo distintivo de los marcadores del mapa, para ponerlo al lado del
 * titulo de una tarjeta (garaje, playa, avion...). rotate: grados (el avion
 * apunta hacia donde va).
 */
export default function GlyphBadge({ glyph, bg, fg, border = 'transparent', shape = 'square', size = 30, rotate }) {
  return (
    <span className="glyph-badge" style={{ width: size, height: size }} aria-hidden="true">
      <span
        className={`map-badge map-badge-${shape}${FILLED.has(glyph) ? ' map-badge-filled' : ''}`}
        style={{ background: bg, color: fg, borderColor: border }}
      >
        <svg
          viewBox="0 0 24 24"
          focusable="false"
          style={rotate != null ? { transform: `rotate(${rotate}deg)` } : undefined}
        >
          <path d={GLYPHS[glyph]} />
        </svg>
      </span>
    </span>
  )
}
