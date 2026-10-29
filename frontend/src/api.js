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

/** Error de la API con el codigo HTTP y el mensaje del servidor (campo "detail"), listo para mostrar. */
export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

/**
 * Pedido con cuerpo JSON (cuentas). token: la sesion, si hay. Devuelve el
 * JSON de la respuesta (o null si no tiene cuerpo).
 */
export async function apiSend(method, path, { body, token } = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'No hay conexión con el servidor. Probá de nuevo en un momento.')
  }
  if (!response.ok) {
    let detail = null
    try {
      detail = (await response.json())?.detail ?? null
    } catch {
      // Sin cuerpo JSON.
    }
    throw new ApiError(response.status, detail ?? 'Algo salió mal. Probá de nuevo en un momento.')
  }
  return response.status === 204 ? null : response.json()
}

/** GET con la sesion (por ejemplo, /api/v1/cuenta). */
export function apiGetWithToken(path, token) {
  return apiSend('GET', path, { token })
}
