import { useCallback, useSyncExternalStore } from 'react'

/** Si la pantalla cumple la media query ("(max-width: 520px)"), al dia si cambia. */
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      const list = window.matchMedia?.(query)
      list?.addEventListener('change', onChange)
      return () => list?.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(query).matches ?? false,
    () => false,
  )
}

/** Celular: los textos largos (placeholders) van en su version corta. */
export const NARROW = '(max-width: 520px)'
