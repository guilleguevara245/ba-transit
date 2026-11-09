/** Si la persona pidio menos movimiento en su sistema: las animaciones se saltean. */
export const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/**
 * Llama a fn cuando la pagina termino de cargar, esta a la vista y el
 * navegador tiene un respiro. La animacion corre en el hilo principal: si
 * arranca mientras la pagina todavia se esta armando (mapas, tarjetas,
 * fuentes), cuando se pinta el primer cuadro ya termino y no se ve.
 */
export function whenSettled(fn) {
  let cancelled = false
  const start = () =>
    !cancelled && window.requestAnimationFrame(() => window.requestAnimationFrame(() => !cancelled && fn()))
  const run = () => {
    if (cancelled) return
    if (document.hidden) {
      document.addEventListener('visibilitychange', run, { once: true })
      return
    }
    if (window.requestIdleCallback) window.requestIdleCallback(start, { timeout: 1200 })
    else setTimeout(start, 200)
  }
  if (document.readyState === 'complete') run()
  else window.addEventListener('load', run, { once: true })
  return () => {
    cancelled = true
  }
}
