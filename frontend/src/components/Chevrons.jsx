import './Chevrons.css'

/**
 * Tres chevrones como los del logo, en lugar de una flecha. Quietos se
 * ven en degrade; cuando se pasa el mouse por el elemento que los
 * contiene (clase "chevrons-host") se encienden uno tras otro, como si
 * avanzaran.
 */
export default function Chevrons({ direction = 'right', className = '' }) {
  return (
    <svg
      className={`chevrons chevrons-${direction} ${className}`}
      viewBox="0 0 48 34"
      aria-hidden="true"
      focusable="false"
    >
      <polygon points="0,0 8,0 19,17 8,34 0,34 11,17" />
      <polygon points="14,0 22,0 33,17 22,34 14,34 25,17" />
      <polygon points="28,0 36,0 47,17 36,34 28,34 39,17" />
    </svg>
  )
}
