import { useEffect, useState } from 'react'
import { apiGet } from '../api.js'

/**
 * Pide un endpoint GET y devuelve { data, loading, error }.
 * Centraliza el manejo de estados de carga/error para no repetirlo
 * en cada componente que necesita datos de la API.
 */
export function useApi(path) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setError(null)

    apiGet(path)
      .then((result) => {
        if (!cancelled) {
          setData(result)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    // Si el componente se desmonta antes de que termine el fetch,
    // "cancelled" evita que actualicemos el estado de un componente
    // que ya no existe (React tira un warning si eso pasa).
    return () => {
      cancelled = true
    }
  }, [path])

  return { data, loading, error }
}
