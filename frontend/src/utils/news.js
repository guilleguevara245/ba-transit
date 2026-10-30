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
