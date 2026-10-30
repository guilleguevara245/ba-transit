import { useCallback, useEffect, useRef, useState } from 'react'
import { apiGet } from '../api.js'

const INITIAL_STATE = { data: null, loading: true, error: null, updatedAt: null, refreshing: false }

/**
 * Pedidos en curso por path: si dos componentes piden lo mismo a la vez
 * (en el inicio, eventos y alertas), se hace un solo pedido y los dos
 * esperan la misma respuesta. Al terminar se olvida: no es una cache.
 */
const inFlight = new Map()

function sharedGet(path) {
  if (!inFlight.has(path)) {
    const request = apiGet(path).finally(() => inFlight.delete(path))
    inFlight.set(path, request)
  }
  return inFlight.get(path)
}

/**
 * Pide un endpoint GET y devuelve { data, loading, error, updatedAt }.
 *
 * Con { refreshMs } vuelve a pedir el dato cada refreshMs milisegundos
 * (por ejemplo, las alertas, que el backend sincroniza cada 5 minutos).
 * En los refrescos no vuelve a mostrar "cargando": si fallan, se
 * conservan los ultimos datos y solo se informa el error. Mientras la
 * pestaña del navegador esta oculta no se hacen pedidos. Con path null
 * no se pide nada (sirve para pedidos que dependen de otro dato).
 *
 * reload() vuelve a pedir ahora (boton "Actualizar"): mientras tanto
 * refreshing es true y se siguen mostrando los datos que habia.
 */
export function useApi(path, { refreshMs } = {}) {
  const [state, setState] = useState(INITIAL_STATE)
  const loadRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    let timer = null
    let hasLoaded = false

    setState(INITIAL_STATE)

    // Sin path (por ejemplo, mientras falta un dato previo) no se pide nada.
    if (!path) {
      setState({ ...INITIAL_STATE, loading: false })
      return undefined
    }

    function scheduleNext() {
      if (!cancelled && refreshMs) {
        clearTimeout(timer)
        timer = setTimeout(load, refreshMs)
      }
    }

    async function load(manual = false) {
      // Con la pestaña oculta no se pide nada (salvo la primera carga o si lo piden a mano).
      if (hasLoaded && document.hidden && !manual) {
        scheduleNext()
        return
      }
      clearTimeout(timer)
      if (manual) setState((previous) => ({ ...previous, refreshing: true }))
      try {
        const result = await sharedGet(path)
        if (!cancelled) {
          hasLoaded = true
          setState({ data: result, loading: false, error: null, updatedAt: new Date(), refreshing: false })
        }
      } catch (err) {
        if (!cancelled) {
          setState((previous) => ({ ...previous, loading: false, refreshing: false, error: err.message }))
        }
      } finally {
        scheduleNext()
      }
    }

    loadRef.current = load
    load()

    // Si el componente se desmonta (o cambia el path) antes de que
    // termine el fetch, "cancelled" evita actualizar un estado viejo.
    return () => {
      cancelled = true
      clearTimeout(timer)
      loadRef.current = null
    }
  }, [path, refreshMs])

  const reload = useCallback(() => loadRef.current?.(true), [])
  return { ...state, reload }
}
