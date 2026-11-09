import { useEffect, useRef, useState } from 'react'
import { reducedMotion } from '../utils/motion.js'

/**
 * Cuenta cada cambio de value despues del primero (0 mientras no cambio).
 * Sirve de key para volver a correr una animacion de CSS cuando, por
 * ejemplo, una linea pasa de Normal a Demoras. Con menos movimiento pedido
 * en el sistema, no cuenta.
 */
export function useFlash(value) {
  const [count, setCount] = useState(0)
  const last = useRef(value)
  useEffect(() => {
    if (last.current === value) return
    last.current = value
    if (!reducedMotion()) setCount((n) => n + 1)
  }, [value])
  return count
}
