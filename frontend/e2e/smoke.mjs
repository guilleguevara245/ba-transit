// Pruebas de punta a punta: abre el sitio compilado en un navegador real
// (Chromium con Playwright) y comprueba que las paginas principales cargan
// sin errores. La API se reemplaza por datos de muestra (fixtures.json), asi
// la prueba no depende del backend ni de las APIs externas.
//
// Uso: npm run build && npx vite preview --port 4173 &  node e2e/smoke.mjs
// (BASE_URL cambia la direccion; en CI lo hace el workflow).

import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4173'
const FIXTURES = JSON.parse(readFileSync(new URL('./fixtures.json', import.meta.url), 'utf8'))

const CHECKS = [
  { path: '/', name: 'Inicio', expect: ['Estado de la red', 'Alertas destacadas', 'Tarifas vigentes'] },
  { path: '/lineas/subte-b', name: 'Línea B', expect: ['Línea B', 'Ramales y estaciones', 'Medrano'] },
  { path: '/mapa', name: 'Mapa', expect: ['Mapa de la red'], selector: '.leaflet-container' },
  { path: '/estado', name: 'Estado de los datos', expect: ['Estado de los datos', 'Alertas del subte'] },
]

async function run() {
  const browser = await chromium.launch()
  const failures = []

  for (const check of CHECKS) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    const errors = []
    page.on('pageerror', (error) => errors.push(`error de JavaScript: ${error.message}`))

    // API: los datos de muestra; lo que no esta, 404 (la pagina tiene que tolerarlo).
    await page.route('**/api/v1/**', (route) => {
      const url = new URL(route.request().url())
      const key = decodeURIComponent(url.pathname + url.search)
      const body = FIXTURES[key] ?? FIXTURES[url.pathname]
      return body === undefined
        ? route.fulfill({ status: 404, contentType: 'application/json', body: '{"title":"Sin datos de muestra"}' })
        : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    })
    // Sin salir a internet: mapas y fuentes externas se responden vacios.
    await page.route(/^https:\/\/(tile\.openstreetmap\.org|fonts\.(googleapis|gstatic)\.com)\//, (route) =>
      route.fulfill({ status: 204, body: '' }),
    )

    try {
      await page.goto(BASE_URL + check.path, { waitUntil: 'networkidle' })
      for (const text of check.expect) {
        await page.getByText(text, { exact: false }).first().waitFor({ timeout: 10_000 })
      }
      if (check.selector) await page.locator(check.selector).first().waitFor({ timeout: 10_000 })
    } catch (error) {
      errors.push(error.message.split('\n')[0])
    }

    if (errors.length > 0) {
      failures.push(`${check.name} (${check.path}):\n  - ${errors.join('\n  - ')}`)
      console.log(`✗ ${check.name}`)
    } else {
      console.log(`✓ ${check.name}`)
    }
    await page.close()
  }

  await browser.close()
  if (failures.length > 0) {
    console.error(`\n${failures.length} página(s) con problemas:\n${failures.join('\n')}`)
    process.exit(1)
  }
  console.log(`\nLas ${CHECKS.length} páginas cargaron bien.`)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
