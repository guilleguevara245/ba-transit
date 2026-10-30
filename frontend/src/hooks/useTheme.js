import { useCallback, useEffect, useState } from 'react'
import { PREFS_CHANGED } from '../utils/prefsEvents.js'

export const THEME_KEY = 'ba-transit-tema'
/** El tema cambio desde afuera (por ejemplo, el de la cuenta en otro dispositivo). */
export const THEME_APPLIED = 'ba-transit:tema-aplicado'

/** Pone el tema y lo guarda. silent: no avisa (para no subirlo de nuevo a la cuenta). */
export function applyTheme(next, { silent = false } = {}) {
  document.documentElement.dataset.theme = next
  try {
    window.localStorage.setItem(THEME_KEY, next)
  } catch {
    // Sin almacenamiento (modo privado): el tema dura hasta recargar.
  }
  window.dispatchEvent(new window.CustomEvent(THEME_APPLIED))
  if (!silent) window.dispatchEvent(new window.CustomEvent(PREFS_CHANGED))
}

function currentTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

/**
 * Tema claro u oscuro. El tema inicial lo pone un script en index.html
 * (antes de que cargue React, para que no parpadee): lo guardado en este
 * navegador o, si no hay nada, la preferencia del sistema.
 */
export function useTheme() {
  const [theme, setTheme] = useState(currentTheme)

  useEffect(() => {
    const sync = () => setTheme(currentTheme())
    window.addEventListener(THEME_APPLIED, sync)
    return () => window.removeEventListener(THEME_APPLIED, sync)
  }, [])

  const choose = useCallback((next) => {
    applyTheme(next)
    setTheme(next)
  }, [])

  const toggle = useCallback(() => choose(currentTheme() === 'dark' ? 'light' : 'dark'), [choose])

  return { theme, toggle, choose }
}
