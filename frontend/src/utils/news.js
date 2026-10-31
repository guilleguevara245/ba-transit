/** Temas de las noticias (los del servidor: NewsClassifier) con su etiqueta y color. */
export const NEWS_CATEGORIES = [
  { key: 'SUBTE', label: 'Subte', className: 'news-kind-subte' },
  { key: 'TRENES', label: 'Trenes', className: 'news-kind-trenes' },
  { key: 'COLECTIVOS', label: 'Colectivos', className: 'news-kind-colectivos' },
  { key: 'GENERAL', label: 'General', className: '' },
]

/** Cuantas noticias hay de cada tema: { SUBTE: 3, ... }. */
export function newsCounts(items) {
  const counts = Object.fromEntries(NEWS_CATEGORIES.map((c) => [c.key, 0]))
  for (const n of items ?? []) if (n.category in counts) counts[n.category] += 1
  return counts
}

/** Palabras que no distinguen una nota de otra (y las del tema, que comparten todas). */
const NEWS_STOPWORDS = new Set(
  (
    'para como sobre entre desde hasta mientras pero porque cuando donde este esta estos estas ese esa eso ' +
    'tras ante segun contra durante luego todo todos toda todas otro otra otros otras mismo misma ' +
    'amba buenos aires ciudad porteño porteno colectivo colectivos subte subtes tren trenes linea lineas ' +
    'transporte publico pasajeros usuarios boleto boletos'
  ).split(' '),
)

/** Las palabras que importan de un titular, recortadas a 6 letras ("aumenta" y "aumentará" cuentan igual). */
export function headlineStems(title) {
  return new Set(
    String(title ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3 && !NEWS_STOPWORDS.has(w))
      .map((w) => w.slice(0, 6)),
  )
}

/**
 * Si dos titulares cuentan la misma nota: comparten al menos 3 palabras y
 * eso es al menos el 40 % del mas corto.
 */
export function sameStory(a, b) {
  const x = headlineStems(a)
  const y = headlineStems(b)
  if (x.size === 0 || y.size === 0) return false
  let shared = 0
  for (const w of x) if (y.has(w)) shared += 1
  return shared >= 3 && shared / Math.min(x.size, y.size) >= 0.4
}

/** Las noticias sin repetir la misma nota: queda la primera (la mas reciente). */
export function dedupeNews(items) {
  const kept = []
  for (const n of items ?? []) {
    if (!kept.some((k) => sameStory(k.title, n.title))) kept.push(n)
  }
  return kept
}
