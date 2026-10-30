import { apiGetWithToken, apiSend } from '../api.js'
import { mergeFavorites, readAll, writeList, FAVORITE_KINDS } from './favoritesStore.js'
import { mergePlaces, readPlaces, writePlaces } from './placesStore.js'
import { applyNoticePrefs, hasSavedPrefs, readPrefs } from './push.js'
import { applyTheme, THEME_KEY } from '../hooks/useTheme.js'
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
  await syncPlaces()
  await syncPreferences()
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

/** Cambia el nombre de la cuenta. */
export async function rename(name) {
  const session = getSession()
  const user = await apiSend('PUT', '/api/v1/cuenta/nombre', { body: { name }, token: session.token })
  setSession({ ...session, user })
}

/**
 * Agrega o cambia la contraseña (current: la actual, si la cuenta ya tenia).
 * Las demas sesiones se cierran; este dispositivo sigue con una nueva.
 */
export async function changePassword(current, password) {
  const session = getSession()
  setSession(await apiSend('PUT', '/api/v1/cuenta/contrasena', { body: { current, password }, token: session.token }))
}

/** Cierra la sesion en todos los demas dispositivos. */
export async function closeOtherSessions() {
  const session = getSession()
  setSession(await apiSend('POST', '/api/v1/cuenta/cerrar-sesiones', { token: session.token }))
}

/** Descarga todo lo que guarda la cuenta, como archivo JSON. */
export async function downloadMyData() {
  const session = getSession()
  const data = await apiGetWithToken('/api/v1/cuenta/datos', session.token)
  const blob = new window.Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'ba-transit-mis-datos.json'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => window.URL.revokeObjectURL(url), 1000)
}

/**
 * Cierra la sesion en este navegador (y la borra del servidor, asi deja de
 * figurar en Dispositivos). Los favoritos quedan en el dispositivo.
 */
export function logout() {
  const session = getSession()
  setSession(null)
  if (session) apiSend('DELETE', '/api/v1/cuenta/sesion', { token: session.token }).catch(() => {})
}

/** Los dispositivos con la cuenta abierta: [{ id, device, kind, createdAt, lastSeenAt, current }]. */
export async function listDevices() {
  const session = getSession()
  return apiGetWithToken('/api/v1/cuenta/dispositivos', session.token)
}

/** Cierra la sesion de otro dispositivo. */
export async function closeDevice(id) {
  const session = getSession()
  await apiSend('DELETE', `/api/v1/cuenta/dispositivos/${encodeURIComponent(id)}`, { token: session.token })
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

/** Con que cuenta se sincronizaron por ultima vez los lugares de este navegador. */
const PLACES_SYNC_KEY = 'ba-transit:lugares-cuenta'
let placesTimer = null

/** Trae Mis lugares de la cuenta y los une con los de este navegador (ver mergePlaces). */
export async function syncPlaces() {
  const session = getSession()
  if (!session) return
  const remote = await apiGetWithToken('/api/v1/cuenta/lugares', session.token)
  let synced = false
  try {
    synced = window.localStorage.getItem(PLACES_SYNC_KEY) === String(session.user.id)
  } catch {
    // Sin almacenamiento: se suman.
  }
  writePlaces(mergePlaces(readPlaces(), remote?.lugares, synced), { silent: true })
  try {
    window.localStorage.setItem(PLACES_SYNC_KEY, String(session.user.id))
  } catch {
    // Sin almacenamiento.
  }
  if (!synced) await pushPlaces()
}

export async function pushPlaces() {
  const session = getSession()
  if (!session) return
  try {
    await apiSend('PUT', '/api/v1/cuenta/lugares', { body: { lugares: readPlaces() }, token: session.token })
  } catch (error) {
    if (error.status === 401) setSession(null)
  }
}

/** Sube los lugares un momento despues del ultimo cambio hecho en esta pagina. */
export function schedulePlacesPush(event) {
  if (event?.detail?.silent || !getSession()) return
  clearTimeout(placesTimer)
  placesTimer = setTimeout(pushPlaces, 500)
}

// ---- Preferencias (tema y avisos) ----

const PREFS_SYNC_KEY = 'ba-transit:preferencias-cuenta'
/** Las preferencias de avisos que se sincronizan (la pausa es de cada dispositivo). */
const NOTICE_KEYS = [
  'version',
  'kinds',
  'notifyResolved',
  'quiet',
  'quietFrom',
  'quietTo',
  'summary',
  'summaryTime',
  'summaryDays',
  'lastTrain',
  'lastTrainMinutes',
]
let prefsTimer = null

/** Lo de este dispositivo: el tema elegido (no el del sistema) y las preferencias de avisos guardadas. */
export function localPreferences() {
  let tema = null
  try {
    tema = window.localStorage.getItem(THEME_KEY)
  } catch {
    // Sin almacenamiento.
  }
  const prefs = readPrefs()
  return {
    tema: tema === 'light' || tema === 'dark' ? tema : null,
    avisos: hasSavedPrefs() ? Object.fromEntries(NOTICE_KEYS.map((k) => [k, prefs[k]])) : null,
  }
}

/** Sin nulls: solo lo que la cuenta tiene guardado. */
const definedOnly = (obj) => Object.fromEntries(Object.entries(obj ?? {}).filter(([, v]) => v !== null && v !== undefined))

/**
 * Al entrar: si este dispositivo ya estaba sincronizado con esta cuenta, o
 * la cuenta ya tiene preferencias, se usan las de la cuenta. Si la cuenta
 * no tiene, se suben las de este dispositivo.
 */
export async function syncPreferences() {
  const session = getSession()
  if (!session) return
  const remote = await apiGetWithToken('/api/v1/cuenta/preferencias', session.token)
  let synced = false
  try {
    synced = window.localStorage.getItem(PREFS_SYNC_KEY) === String(session.user.id)
  } catch {
    // Sin almacenamiento.
  }
  const hasRemote = Boolean(remote?.tema || remote?.avisos)
  if (hasRemote) {
    if (remote.tema) applyTheme(remote.tema, { silent: true })
    if (remote.avisos) await applyNoticePrefs(definedOnly(remote.avisos)).catch(() => {})
  } else if (!synced) {
    await pushPreferences()
  }
  try {
    window.localStorage.setItem(PREFS_SYNC_KEY, String(session.user.id))
  } catch {
    // Sin almacenamiento.
  }
}

export async function pushPreferences() {
  const session = getSession()
  if (!session) return
  try {
    await apiSend('PUT', '/api/v1/cuenta/preferencias', { body: localPreferences(), token: session.token })
  } catch (error) {
    if (error.status === 401) setSession(null)
  }
}

/** Sube el tema y las preferencias de avisos un momento despues del ultimo cambio. */
export function schedulePrefsPush() {
  if (!getSession()) return
  clearTimeout(prefsTimer)
  prefsTimer = setTimeout(pushPreferences, 800)
}
