// Iconos de trazo (24x24) de cada seccion.
const ICONS = {
  inicio: 'M3 11 12 4l9 7v9h-6v-6H9v6H3z',
  mapa: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zm0 0v14m6-12v14',
  colectivos: 'M5 4h14v12H5zM5 11h14M8 19v-3m8 3v-3M7.5 13.5h.01M16.5 13.5h.01',
  aeropuertos: 'M2 13l9-2 4-8h2l-2 9 6 1 1 2-7 1-3 6h-2l1-7-9-2z',
  comoLlegar: 'M12 21s-6-5.5-6-10.5a6 6 0 0 1 12 0C18 15.5 12 21 12 21zm0-8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  estacionamiento: 'M5.5 11.5 7 7.5h10l1.5 4M4.5 11.5h15v5h-15zM7 16.5v2M17 16.5v2M7.5 14h.01M16.5 14h.01',
  accesos: 'M8 3 5 21m11-18 3 18M12 4v3m0 4v3m0 4v3',
  ecobici:
    'M5.5 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm13 0a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5.5 14.5 9 8h6l3.5 6.5M9 8l3 6.5h-1M14 5h2.5',
  sube: 'M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zm-1 4h18M7 15h4',
  estado: 'M3 12h4l3-8 4 16 3-8h4',
  mas: 'M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z',
}

/** Las secciones del header (en computadora, todas en el renglon de arriba). */
export const TABS = [
  { to: '/', label: 'Inicio', icon: ICONS.inicio, end: true },
  { to: '/mapa', label: 'Mapa', icon: ICONS.mapa },
  { to: '/como-llegar', label: 'Cómo llegar', icon: ICONS.comoLlegar },
  { to: '/colectivos', label: 'Colectivos', icon: ICONS.colectivos },
  { to: '/ecobici', label: 'EcoBici', icon: ICONS.ecobici },
  { to: '/accesos', label: 'Accesos', icon: ICONS.accesos },
  { to: '/estacionamiento', label: 'Estacionamiento', icon: ICONS.estacionamiento },
  { to: '/aeropuertos', label: 'Aeropuertos', icon: ICONS.aeropuertos },
]

/** En el celular: las cuatro de la barra de abajo; el resto va en "Más", con SUBE y el estado de los datos. */
export const BAR_TABS = TABS.slice(0, 4)
export const MORE_TABS = [
  ...TABS.slice(4),
  { to: '/sube', label: 'SUBE y tarifas', icon: ICONS.sube },
  { to: '/estado', label: 'Estado de los datos', icon: ICONS.estado },
]
export const MORE_ICON = ICONS.mas
