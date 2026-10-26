import { useTheme } from '../hooks/useTheme.js'

const SUN = 'M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-5.66 1.41-1.41M4.93 19.07l1.41-1.41m0-11.32L4.93 4.93m14.14 14.14-1.41-1.41M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'
const MOON = 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z'

const OPTIONS = [
  { value: 'light', label: 'Tema claro', icon: SUN },
  { value: 'dark', label: 'Tema oscuro', icon: MOON },
]

/** Selector del header entre tema claro y oscuro: dos mitades, la elegida en amarillo. */
export default function ThemeToggle() {
  const { theme, choose } = useTheme()

  return (
    <div className="theme-toggle" role="group" aria-label="Tema">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={theme === option.value ? 'active' : ''}
          aria-pressed={theme === option.value}
          aria-label={option.label}
          title={option.label}
          onClick={() => choose(option.value)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d={option.icon} />
          </svg>
        </button>
      ))}
    </div>
  )
}
