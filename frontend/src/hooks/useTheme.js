import { useCallback, useState } from 'react'

export const THEME_KEY = 'ba-transit-tema'

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

  const toggle = useCallback(() => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      window.localStorage.setItem(THEME_KEY, next)
    } catch {
      // Sin almacenamiento (modo privado): el tema dura hasta recargar.
    }
    setTheme(next)
  }, [])

  return { theme, toggle }
}
