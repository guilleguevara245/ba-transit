import { apiSend } from '../api.js'
import { getSession } from './session.js'

// Los mismos limites que el servidor (ContactService).
export const MIN_LENGTH = 10
export const MAX_LENGTH = 2000
export const MAX_NAME = 80

/** De que se trata el mensaje: el codigo que va al servidor y el texto del boton. */
export const CONTACT_KINDS = [
  { value: 'error', label: 'Un error' },
  { value: 'idea', label: 'Una idea' },
  { value: 'otro', label: 'Otra cosa' },
]

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/

/**
 * Revisa el formulario antes de mandarlo, en el orden en que se ve. Devuelve
 * el primer problema como { field, text } (field: name, lastName, email,
 * kind o message) o null si esta bien.
 */
export function contactProblem({ name, lastName, email, kind, message }) {
  if (!name.trim()) {
    return { field: 'name', text: 'Escribí tu nombre.' }
  }
  if (!lastName.trim()) {
    return { field: 'lastName', text: 'Escribí tu apellido.' }
  }
  const mail = email.trim()
  if (!mail) {
    return { field: 'email', text: 'Escribí tu mail para que podamos responderte.' }
  }
  if (!EMAIL.test(mail)) {
    return { field: 'email', text: 'Escribí un mail válido, por ejemplo nombre@gmail.com.' }
  }
  if (!CONTACT_KINDS.some((k) => k.value === kind)) {
    return { field: 'kind', text: 'Elegí de qué se trata.' }
  }
  const text = message.trim()
  if (text.length < MIN_LENGTH) {
    return { field: 'message', text: `Contanos un poco más (al menos ${MIN_LENGTH} caracteres).` }
  }
  if (text.length > MAX_LENGTH) {
    return { field: 'message', text: `El mensaje es muy largo (hasta ${MAX_LENGTH} caracteres).` }
  }
  return null
}

/** Si el formulario esta disponible (el servidor tiene a donde mandarlo). */
export async function contactAvailable() {
  const status = await apiSend('GET', '/api/v1/contacto')
  return Boolean(status?.available)
}

/**
 * Manda el mensaje. page: la pantalla desde donde se abrio el formulario
 * (ayuda con los errores). website: el campo trampa, que una persona deja
 * vacio. Con la sesion iniciada va el token: el servidor agrega los datos
 * de la cuenta. Tira ApiError con el motivo si no sale.
 */
export function sendContact({ name, lastName, email, kind, message, page, website }) {
  return apiSend('POST', '/api/v1/contacto', {
    body: {
      name: name.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      kind,
      message: message.trim(),
      page: page || null,
      website: website || null,
    },
    token: getSession()?.token,
  })
}
