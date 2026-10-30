import { apiSend } from '../api.js'
import { readAll } from './favoritesStore.js'
import { getSession } from './session.js'
import { upgradePrefs } from './notifPrefs.js'
import { PREFS_CHANGED } from './prefsEvents.js'

/**
 * Avisos (Web Push) de este navegador: activar, actualizar los favoritos y
 * las preferencias, probar y apagar. No hace falta cuenta.
 */

const PREFS_KEY = 'ba-transit:avisos'
/** Tipos que se sumaron despues, por version: a quien ya tenia avisos se le agregan una vez. */
export const NEW_KINDS = { 2: ['clima', 'tarifas', 'especiales'], 3: ['colectivos'] }
export const DEFAULT_PREFS = {
  version: 3,
  kinds: ['lineas', 'estaciones', 'accesos', 'colectivos', ...NEW_KINDS[2]],
  notifyResolved: true,
  quiet: true,
  quietFrom: 23,
  quietTo: 7,
  // Resumen diario de los favoritos (1 = lunes ... 7 = domingo).
  summary: false,
  summaryTime: '07:30',
  summaryDays: [1, 2, 3, 4, 5],
  // Ultimo subte o Premetro de tus lineas: cuantos minutos antes avisar.
  lastTrain: false,
  lastTrainMinutes: 30,
  // Hasta cuando estan pausados (ISO) o null.
  pausedUntil: null,
}

/** El nombre del saludo del inicio, para el resumen ("Buen día, Guille"). */
function greetingName() {
  try {
    return window.localStorage.getItem('ba-transit:nombre') || null
  } catch {
    return null
  }
}

/** Que puede este navegador: 'ok', 'ios-sin-instalar' o 'no'. */
export function pushSupport() {
  const nav = window.navigator
  const hasApis = 'serviceWorker' in nav && 'PushManager' in window && 'Notification' in window
  const ios = /iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1)
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true
  if (ios && !standalone) return 'ios-sin-instalar'
  return hasApis ? 'ok' : 'no'
}

function readSaved() {
  try {
    return JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? 'null')
  } catch {
    return null
  }
}

export function readPrefs() {
  return upgradePrefs(readSaved(), DEFAULT_PREFS, NEW_KINDS)
}

/**
 * Quien ya tenia los avisos activos antes de los tipos nuevos: se los
 * suma una vez y se los manda al servidor (si no, recien los tendria al
 * volver a la pagina de avisos).
 */
export async function upgradeSubscription() {
  const saved = readSaved()
  if (!saved || (saved.version ?? 1) >= DEFAULT_PREFS.version) return
  const prefs = readPrefs()
  savePrefs(prefs, { silent: true })
  const subscription = await currentSubscription()
  if (subscription) await send(subscription, prefs)
}

function savePrefs(prefs, { silent = false } = {}) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // Sin almacenamiento: las preferencias igual quedan en el servidor.
  }
  if (!silent) window.dispatchEvent(new window.CustomEvent(PREFS_CHANGED))
}

/** Si este dispositivo ya guardo preferencias de avisos alguna vez. */
export function hasSavedPrefs() {
  return readSaved() !== null
}

/**
 * Preferencias que llegan de la cuenta: se guardan sin volver a subirlas y,
 * si este dispositivo tiene los avisos activos, se le pasan al servidor.
 * La pausa es de cada dispositivo: se conserva la de aca.
 */
export async function applyNoticePrefs(fromAccount) {
  const current = readPrefs()
  const prefs = { ...current, ...fromAccount, pausedUntil: current.pausedUntil }
  // Ya estaban iguales (lo comun al abrir el sitio): nada que guardar ni mandar.
  if (hasSavedPrefs() && JSON.stringify(prefs) === JSON.stringify(current)) return current
  savePrefs(prefs, { silent: true })
  const subscription = await currentSubscription()
  if (subscription) await send(subscription, prefs)
  return prefs
}

/** La clave publica del servidor (base64url) en el formato que pide PushManager. */
function toUint8(base64url) {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4)
  const raw = window.atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

async function registration() {
  // En produccion main.jsx ya lo registro; si no, se registra aca.
  return (await window.navigator.serviceWorker.getRegistration()) ?? window.navigator.serviceWorker.register('/sw.js')
}

export async function currentSubscription() {
  if (pushSupport() !== 'ok') return null
  const reg = await window.navigator.serviceWorker.getRegistration()
  return reg ? reg.pushManager.getSubscription() : null
}

function body(subscription, prefs) {
  const json = subscription.toJSON()
  return {
    endpoint: json.endpoint,
    keys: json.keys,
    favorites: readAll(),
    kinds: prefs.kinds,
    notifyResolved: prefs.notifyResolved,
    quietFrom: prefs.quiet ? prefs.quietFrom : null,
    quietTo: prefs.quiet ? prefs.quietTo : null,
    summaryTime: prefs.summary ? prefs.summaryTime : null,
    summaryDays: prefs.summaryDays,
    greetingName: greetingName(),
    lastTrainMinutes: prefs.lastTrain ? prefs.lastTrainMinutes : null,
  }
}

async function send(subscription, prefs) {
  await apiSend('PUT', '/api/v1/notificaciones/suscripcion', {
    body: body(subscription, prefs),
    token: getSession()?.token,
  })
}

/** Pide permiso y activa los avisos. Devuelve 'activado', 'denegado' o 'cancelado'. */
export async function enablePush(prefs = readPrefs()) {
  const permission = await window.Notification.requestPermission()
  if (permission === 'denied') return 'denegado'
  if (permission !== 'granted') return 'cancelado'
  const reg = await registration()
  await window.navigator.serviceWorker.ready
  const { publicKey } = await apiSend('GET', '/api/v1/notificaciones/clave')
  const subscription =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8(publicKey) }))
  savePrefs(prefs)
  await send(subscription, prefs)
  return 'activado'
}

export async function updatePush(prefs) {
  savePrefs(prefs)
  const subscription = await currentSubscription()
  if (subscription) await send(subscription, prefs)
}

export async function disablePush() {
  const subscription = await currentSubscription()
  if (!subscription) return
  try {
    await apiSend('POST', '/api/v1/notificaciones/baja', { body: { endpoint: subscription.endpoint } })
  } finally {
    await subscription.unsubscribe()
  }
}

/**
 * Pausa los avisos: 'hora', 'manana' (hasta mañana a las 6), 'lunes'
 * (hasta el lunes a las 6) o null para reanudar. Devuelve las preferencias
 * con pausedUntil al dia.
 */
export async function pausePush(option) {
  const subscription = await currentSubscription()
  if (!subscription) throw new Error('Primero activá los avisos.')
  const { pausedUntil } = await apiSend('POST', '/api/v1/notificaciones/pausa', {
    body: { endpoint: subscription.endpoint, option },
  })
  const prefs = { ...readPrefs(), pausedUntil: pausedUntil ?? null }
  savePrefs(prefs, { silent: true })
  return prefs
}

export async function testPush() {
  const subscription = await currentSubscription()
  if (!subscription) throw new Error('Primero activá los avisos.')
  await apiSend('POST', '/api/v1/notificaciones/prueba', { body: { endpoint: subscription.endpoint } })
}

let syncTimer = null

/** Con avisos activos, sube los favoritos un momento despues de cada cambio. */
export function scheduleFavoritesSync() {
  clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    currentSubscription()
      .then((subscription) => (subscription ? send(subscription, readPrefs()) : null))
      .catch(() => {})
  }, 1000)
}

/** "23 a 7" -> texto para mostrar. */
export function quietLabel(from, to) {
  const h = (n) => `${String(n).padStart(2, '0')}:00`
  return `de ${h(from)} a ${h(to)}`
}
