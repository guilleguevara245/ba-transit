import { useEffect, useState } from 'react'
import { apiGet } from '../api.js'

const INITIAL_STATE = { data: null, loading: true, error: null, updatedAt: null }

/**
 * Pide un endpoint GET y devuelve { data, loading, error, updatedAt }.
 *
 * Con { refreshMs } vuelve a pedir el dato cada refreshMs milisegundos
 * (por ejemplo, las alertas, que el backend sincroniza cada 5 minutos).
 * En los refrescos no vuelve a mostrar "cargando": si fallan, se
 * conservan los ultimos datos y solo se informa el error. Mientras la
 * pestaña del navegador esta oculta no se hacen pedidos. Con path null
 * no se pide nada (sirve para pedidos que dependen de otro dato).
 */
export function useApi(path, { refreshMs } = {}) {
  const [state, setState] = useState(INITIAL_STATE)

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
        timer = setTimeout(load, refreshMs)
      }
    }

    async function load() {
      // Con la pestaña oculta no se pide nada (salvo la primera carga).
      if (hasLoaded && document.hidden) {
        scheduleNext()
        return
      }
      try {
        const result = await apiGet(path)
        if (!cancelled) {
          hasLoaded = true
          setState({ data: result, loading: false, error: null, updatedAt: new Date() })
        }
      } catch (err) {
        if (!cancelled) {
          setState((previous) => ({ ...previous, loading: false, error: err.message }))
        }
      } finally {
        scheduleNext()
      }
    }

    load()

    // Si el componente se desmonta (o cambia el path) antes de que
    // termine el fetch, "cancelled" evita actualizar un estado viejo.
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [path, refreshMs])

  return state
}
