import { useEffect, useRef, useState } from 'react'
import { reducedMotion, whenSettled } from '../utils/motion.js'

const DURATION_MS = 550
const easeOut = (t) => 1 - (1 - t) ** 3

/**
 * Un numero que cuenta hasta su valor: al cambiar (14 bicis pasan a 11) y,
 * con from, tambien al aparecer (de 0 a 11). Solo cambia el texto; con
 * menos movimiento pedido en el sistema muestra el valor de una.
 */
export default function CountUp({ value, from }) {
  const startValue = from ?? value
  const [shown, setShown] = useState(reducedMotion() ? value : startValue)
  const current = useRef(shown)

  useEffect(() => {
    const target = value
    const origin = current.current
    if (origin === target || reducedMotion() || !Number.isFinite(target)) {
      current.current = target
      setShown(target)
      return undefined
    }
    let frame = null
    const cancelWait = whenSettled(() => {
      let start = null
      const tick = (now) => {
        start ??= now
        const t = Math.min(1, (now - start) / DURATION_MS)
        const next = Math.round(origin + (target - origin) * easeOut(t))
        current.current = next
        setShown(next)
        frame = t < 1 ? window.requestAnimationFrame(tick) : null
      }
      frame = window.requestAnimationFrame(tick)
    })
    return () => {
      cancelWait()
      if (frame) window.cancelAnimationFrame(frame)
      // Si se corta a mitad de camino, queda el valor final.
      current.current = target
    }
  }, [value])

  return <span className="count-up">{shown}</span>
}
