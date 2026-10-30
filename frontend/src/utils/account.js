import { apiGetWithToken, apiSend } from '../api.js'
import { mergeFavorites, readAll, writeList, FAVORITE_KINDS } from './favoritesStore.js'
import { firstName, getSession, setSession } from './session.js'

/** Acciones de la cuenta. Los errores (ApiError) traen el mensaje para mostrar. */

const NAME_KEY = 'ba-transit:nombre'

/** Si el saludo todavia no tiene nombre, usa el de la cuenta. */
function adoptName(user) {
  try {
    if (!window.localStorage.getItem(NAME_KEY) && firstName(user)) window.localStorage.setItem(NAME_KEY, firstName(user))
  } catch {
    // Sin almacenamiento.
  }
}

async function start(session) {
  setSession(session)
  adoptName(session.user)
  await syncFavorites()
}

export const authConfig = () => apiSend('GET', '/api/v1/auth/config')

export async function register({ email, password, name }) {
  await start(await apiSend('POST', '/api/v1/auth/registro', { body: { email, password, name } }))
}

export async function login({ email, password }) {
  await start(await apiSend('POST', '/api/v1/auth/ingreso', { body: { email, password } }))
}

export async function loginWithGoogle(credential) {
  await start(await apiSend('POST', '/api/v1/auth/google', { body: { credential } }))
}

/** Pide el mail para recuperar la contraseña (el servidor responde igual haya o no cuenta). */
export async function requestPasswordReset(email) {
  await apiSend('POST', '/api/v1/auth/recuperar', { body: { email } })
}

/** Contraseña nueva con el codigo del link del mail; deja la sesion iniciada. */
export async function resetPassword(code, password) {
  await start(await apiSend('POST', '/api/v1/auth/restablecer', { body: { code, password } }))
}

/** Elige la imagen: { kind: 'avatar', value } | { kind: 'google' } | { kind: null } (la inicial). */
export async function setImage(kind, value = null) {
  const session = getSession()
  const user = await apiSend('PUT', '/api/v1/cuenta/imagen', { body: { kind, value }, token: session.token })
  setSession({ ...session, user })
}

/** Sube la foto propia (ya recortada y achicada: ver photoToDataUrl). */
export async function uploadPhoto(dataUrl) {
  const session = getSession()
  const user = await apiSend('PUT', '/api/v1/cuenta/foto', { body: { dataUrl }, token: session.token })
  setSession({ ...session, user })
}

/** Cierra la sesion en este navegador; los favoritos quedan en el dispositivo. */
export function logout() {
  setSession(null)
}

export async function deleteAccount() {
  const session = getSession()
  if (session) await apiSend('DELETE', '/api/v1/cuenta', { token: session.token })
  setSession(null)
}

/** Confirma que la sesion siga valida (la cuenta pudo borrarse o el token vencer). */
export async function refreshUser() {
  const session = getSession()
  if (!session) return
  try {
    const user = await apiGetWithToken('/api/v1/cuenta', session.token)
    setSession({ ...session, user })
  } catch (error) {
    if (error.status === 401) setSession(null)
  }
}

/**
 * Al entrar: une los favoritos de este navegador con los de la cuenta, los
 * guarda en los dos lados y desde ahi cada cambio se sube (pushFavorites).
 */
export async function syncFavorites() {
  const session = getSession()
  if (!session) return
  const remote = await apiGetWithToken('/api/v1/cuenta/favoritos', session.token)
  const merged = mergeFavorites(readAll(), remote)
  pausePush = true
  try {
    for (const kind of Object.keys(FAVORITE_KINDS)) writeList(kind, merged[kind])
  } finally {
    pausePush = false
  }
  await pushFavorites()
}

let pausePush = false
let pushTimer = null

export async function pushFavorites() {
  const session = getSession()
  if (!session || pausePush) return
  try {
    await apiSend('PUT', '/api/v1/cuenta/favoritos', { body: readAll(), token: session.token })
  } catch (error) {
    if (error.status === 401) setSession(null)
  }
}

/** Sube los favoritos un momento despues del ultimo cambio (si tocan varias estrellas seguidas, un pedido). */
export function schedulePush() {
  if (pausePush || !getSession()) return
  clearTimeout(pushTimer)
  pushTimer = setTimeout(pushFavorites, 800)
}
