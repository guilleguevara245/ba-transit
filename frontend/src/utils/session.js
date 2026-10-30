/**
 * Sesion de la cuenta (opcional): { token, user } guardado en este
 * navegador. Los componentes se suscriben con useSession.
 */

const STORAGE_KEY = 'ba-transit:sesion'
const listeners = new Set()
let current = load()

function load() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null')
    return parsed && typeof parsed.token === 'string' && parsed.user ? parsed : null
  } catch {
    return null
  }
}

export function getSession() {
  return current
}

export function setSession(session) {
  current = session
  try {
    if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Sin almacenamiento: la sesion dura hasta recargar.
  }
  listeners.forEach((listener) => listener(session))
}

export function subscribeSession(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** El nombre para el saludo (el apellido va aparte: "Juan Pablo" sale entero). */
export function firstName(user) {
  return user?.name?.trim() ?? ''
}

/** Nombre y apellido ("Ana Pérez"), para la cuenta. */
export function fullName(user) {
  return [user?.name, user?.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
}
