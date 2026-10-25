/**
 * Aeropuertos de la Ciudad y el AMBA.
 * Colectivos con parada en Aeroparque: "Los Mapas de Ale", guia de como
 * llegar a Aeroparque. Linea 8 entre aeropuertos: Ladevi (14/08/2026).
 * Coordenadas: Wikipedia (AEP) y learn-atc (SAEZ). Revisar si cambian
 * los recorridos.
 */
export const AIRPORTS = [
  {
    code: 'AEP',
    name: 'Aeroparque Jorge Newbery',
    area: 'Costanera Norte, Ciudad de Buenos Aires',
    kind: 'Vuelos de cabotaje y regionales',
    latitude: -34.55889,
    longitude: -58.41639,
    buses: ['8', '33', '34', '37', '45', '114', '160', '166'],
    notes: ['La línea 8 une Aeroparque con Ezeiza.'],
  },
  {
    code: 'EZE',
    name: 'Aeropuerto Internacional de Ezeiza',
    area: 'Ministro Pistarini, partido de Ezeiza',
    kind: 'Vuelos internacionales',
    latitude: -34.822,
    longitude: -58.536,
    buses: ['8'],
    notes: [
      'Línea 8, ramal común por Liniers (2 h 30 a 3 h desde Aeroparque) o semirrápido por autopista (unos 85 min).',
      'También hay buses directos privados desde la ciudad (Tienda León, NEO).',
    ],
  },
]

export const FLIGHTS_URL = 'https://www.aa2000.com.ar/'
