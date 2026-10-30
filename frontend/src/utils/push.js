import { apiSend } from '../api.js'
import { readAll } from './favoritesStore.js'
import { getSession } from './session.js'

/**
 * Avisos (Web Push) de este navegador: activar, actualizar los favoritos y
 * las preferencias, probar y apagar. No hace falta cuenta.
 */

const PREFS_KEY = 'ba-transit:avisos'
export const DEFAULT_PREFS = {
  kinds: ['lineas', 'estaciones', 'accesos'],
  notifyResolved: true,
  quiet: true,
  quietFrom: 23,
  quietTo: 7,
  // Resumen diario de los favoritos (1 = lunes ... 7 = domingo).
  summary: false,
  summaryTime: '07:30',
  summaryDays: [1, 2, 3, 4, 5],
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

export function readPrefs() {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? '{}') }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

function savePrefs(prefs) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // Sin almacenamiento: las preferencias igual quedan en el servidor.
  }
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
