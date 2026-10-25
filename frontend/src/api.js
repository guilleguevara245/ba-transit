// En produccion se define VITE_API_BASE_URL con la URL del backend
// desplegado. En desarrollo puede quedar vacia: las rutas /api/... son
// relativas y el proxy de Vite (vite.config.js) las manda a localhost:8080.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export async function apiGet(path) {
  const response = await fetch(`${API_BASE_URL}${path}`)
  if (!response.ok) {
    throw new Error(`La API respondió ${response.status} para ${path}`)
  }
  return response.json()
}
