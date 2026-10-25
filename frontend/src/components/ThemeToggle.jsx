import { useTheme } from '../hooks/useTheme.js'

const SUN = 'M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-5.66 1.41-1.41M4.93 19.07l1.41-1.41m0-11.32L4.93 4.93m14.14 14.14-1.41-1.41M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'
const MOON = 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z'

/** Boton del header para pasar de tema claro a oscuro y viceversa. */
export default function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'
  const label = dark ? 'Activar tema claro' : 'Activar tema oscuro'

  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label={label} title={label}>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d={dark ? SUN : MOON} />
      </svg>
    </button>
  )
}
