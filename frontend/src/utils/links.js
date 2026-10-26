const URL = /(https?:\/\/[^\s)]+)/g

/** Separa un texto en partes de texto y links ("entrá en: https://..."). */
export function splitLinks(text) {
  const parts = []
  let last = 0
  for (const match of (text ?? '').matchAll(URL)) {
    // Un punto o coma al final es puntuacion, no parte del link.
    const url = match[0].replace(/[.,;:]+$/, '')
    if (match.index > last) parts.push({ text: text.slice(last, match.index) })
    parts.push({ text: url, url })
    last = match.index + url.length
  }
  if (last < (text ?? '').length) parts.push({ text: text.slice(last) })
  return parts
}
