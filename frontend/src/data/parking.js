/**
 * Lugares para estacionar, de los datasets de Buenos Aires Data
 * (actualizados el 22/06/2026 Secretaria de Transporte). Por ahora solo
 * motos, y el dataset cubre el microcentro.
 *
 * - MOTO_STREET: lugares en la via publica (vereda o calzada), por cuadra.
 * - MOTO_GARAGES: cocheras comerciales que aceptan motos (si es exclusivo para motos y pisos *   bajo techo o a cielo abierto capacidad).
 *
 * - PUBLIC_LOTS: playas de estacionamiento concesionadas por la Ciudad
 *   (muchas subterraneas), de "Estacionamientos concesionados de
 *   movilidad sustentable".
 *
 * Generado a partir de estacionamientos-de-motos-publico.csv y
 * estacionamientos-de-motos-privado.csv.
 */

export const PARKING_SOURCE = {
  name: 'Buenos Aires Data — Estacionamientos de Motos',
  url: 'https://data.buenosaires.gob.ar/dataset/estacionamientos-motos',
  updated: '2026-06-22',
}

export const MOTO_STREET = [
  {
    id: 'mp1',
    lat: -34.607178,
    lon: -58.381787,
    street: '9 de Julio (Cerrito)',
    between: [
      'B. Mitre',
      'Tte. Gral. J. D. Perón'
    ],
    where: 'Vereda',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp2',
    lat: -34.611276,
    lon: -58.381632,
    street: '9 de Julio (Lima)',
    between: [
      'A. Alsina',
      'Moreno'
    ],
    where: 'Vereda',
    barrio: 'Monserrat'
  },
  {
    id: 'mp3',
    lat: -34.607484,
    lon: -58.380889,
    street: '9 de Julio (C. Pellegrini)',
    between: [
      'Rivadavia',
      'Bartolomé Mitre'
    ],
    where: 'Vereda',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp4',
    lat: -34.60707,
    lon: -58.38093,
    street: '9 de Julio (C. Pellegrini)',
    between: [
      'Bartolomé Mitre',
      'Tte. Gral. J. D. Perón'
    ],
    where: 'Vereda',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp5',
    lat: -34.603263,
    lon: -58.380863,
    street: '9 de Julio (C. Pellegrini)',
    between: [
      'Av. Corrientes',
      'Lavalle'
    ],
    where: 'Vereda',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp6',
    lat: -34.602005,
    lon: -58.381234,
    street: '9 de Julio (C. Pellegrini)',
    between: [
      'Lavalle',
      'Tucumán'
    ],
    where: 'Vereda',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp7',
    lat: -34.600873,
    lon: -58.381301,
    street: '9 de Julio (C. Pellegrini)',
    between: [
      'Tucumán',
      'Viamonte'
    ],
    where: 'Vereda',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp8',
    lat: -34.600324,
    lon: -58.381382,
    street: '9 de Julio (C. Pellegrini)',
    between: [
      'Viamonte',
      'Av. Córdoba'
    ],
    where: 'Vereda',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp9',
    lat: -34.605809,
    lon: -58.380999,
    street: '9 de Julio (C. Pellegrini)',
    between: [
      'Tte. Gral. J. D. Perón',
      'Sarmiento'
    ],
    where: 'Vereda',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp10',
    lat: -34.608148,
    lon: -58.380853,
    street: '9 de Julio (C. Pellegrini)',
    between: [
      'Rivadavia',
      'Bartolomé Mitre'
    ],
    where: 'Vereda',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp11',
    lat: -34.608555,
    lon: -58.380646,
    street: '9 de Julio (C. Pellegrini)',
    between: [
      'Rivadavia',
      'Av. De Mayo'
    ],
    where: 'Vereda',
    barrio: 'Monserrat'
  },
  {
    id: 'mp12',
    lat: -34.612353,
    lon: -58.380716,
    street: '9 de Julio (B. de Irigoyen)',
    between: [
      'Moreno',
      'Av. Belgrano'
    ],
    where: 'Vereda',
    barrio: 'Monserrat'
  },
  {
    id: 'mp13',
    lat: -34.605895,
    lon: -58.38027,
    street: 'Pje. Carabelas',
    between: [
      'Tte. Gral. J. D. Perón',
      'Sarmiento'
    ],
    where: 'Vereda',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp14',
    lat: -34.604805,
    lon: -58.380271,
    street: 'Pje. Carabelas',
    between: [
      'Sarmiento',
      'Av. Pres. R. Sáenz Peña'
    ],
    where: 'Vereda',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp15',
    lat: -34.60396,
    lon: -58.384378,
    street: 'Av. Corrientes',
    between: [
      'Libertad',
      'Talcahuano'
    ],
    where: 'Vereda',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp16',
    lat: -34.604054,
    lon: -58.385992,
    street: 'Av. Corrientes',
    between: [
      'Talcahuano',
      'Uruguay'
    ],
    where: 'Vereda',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp17',
    lat: -34.604372,
    lon: -58.390094,
    street: 'Av. Corrientes',
    between: [
      'Montevideo',
      'Rodríguez Peña'
    ],
    where: 'Vereda',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp18',
    lat: -34.604517,
    lon: -58.391801,
    street: 'Av. Corrientes',
    between: [
      'Rodríguez Peña',
      'Av. Callao'
    ],
    where: 'Vereda',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp19',
    lat: -34.605593,
    lon: -58.378329,
    street: 'Av. Pres. R. Sáenz Peña',
    between: [
      'Esmeralda',
      'Suipacha'
    ],
    where: 'Vereda',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp20',
    lat: -34.604529,
    lon: -58.379869,
    street: 'Av. Pres. R. Sáenz Peña',
    between: [
      'Suipacha',
      'Carlos Pellegrini'
    ],
    where: 'Vereda',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp21',
    lat: -34.604716,
    lon: -58.379596,
    street: 'Av. Pres. R. Sáenz Peña',
    between: [
      'Sarmiento',
      'Carabelas'
    ],
    where: 'Vereda',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp22',
    lat: -34.603129,
    lon: -58.38251,
    street: 'Av. Pres. R. Sáenz Peña',
    between: [
      'Cerrito',
      'Libertad'
    ],
    where: 'Vereda',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp23',
    lat: -34.608183,
    lon: -58.377894,
    street: 'Rivadavia',
    between: [
      'Esmeralda',
      'Suipacha'
    ],
    where: 'Vereda',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp24',
    lat: -34.608652,
    lon: -58.374633,
    street: 'Av. de Mayo',
    between: [
      'Bolívar',
      'Perú'
    ],
    where: 'Calle',
    barrio: 'Monserrat'
  },
  {
    id: 'mp25',
    lat: -34.6087,
    lon: -58.375404,
    street: 'Av. de Mayo',
    between: [
      'Perú',
      'Chacabuco'
    ],
    where: 'Calle',
    barrio: 'Monserrat'
  },
  {
    id: 'mp26',
    lat: -34.608889,
    lon: -58.378052,
    street: 'Av. de Mayo',
    between: [
      'Piedras',
      'Tacuarí'
    ],
    where: 'Calle',
    barrio: 'Monserrat'
  },
  {
    id: 'mp27',
    lat: -34.609041,
    lon: -58.380289,
    street: 'Av. de Mayo',
    between: [
      'Tacuarí',
      'Bernardo de Irigoyen'
    ],
    where: 'Calle',
    barrio: 'Monserrat'
  },
  {
    id: 'mp28',
    lat: -34.609104,
    lon: -58.376375,
    street: 'Chacabuco',
    between: [
      'Av. de Mayo',
      'H. Yrigoyen'
    ],
    where: 'Calle',
    barrio: 'Monserrat'
  },
  {
    id: 'mp29',
    lat: -34.603163,
    lon: -58.371702,
    street: 'Av. Corrientes',
    between: [
      '25 de Mayo',
      'Reconquista'
    ],
    where: 'Calle',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp30',
    lat: -34.603249,
    lon: -58.373041,
    street: 'Av. Corrientes',
    between: [
      'Reconquista',
      'San Martín'
    ],
    where: 'Calle',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp31',
    lat: -34.603333,
    lon: -58.374574,
    street: 'Av. Corrientes',
    between: [
      'San Martín',
      'Florida'
    ],
    where: 'Calle',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp32',
    lat: -34.603444,
    lon: -58.376228,
    street: 'Av. Corrientes',
    between: [
      'Florida',
      'Maipú'
    ],
    where: 'Calle',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp33',
    lat: -34.603511,
    lon: -58.377338,
    street: 'Av. Corrientes',
    between: [
      'Maipú',
      'Esmeralda'
    ],
    where: 'Calle',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp34',
    lat: -34.603591,
    lon: -58.378532,
    street: 'Av. Corrientes',
    between: [
      'Esmeralda',
      'Suipacha'
    ],
    where: 'Calle',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp35',
    lat: -34.603679,
    lon: -58.380124,
    street: 'Av. Corrientes',
    between: [
      'Suipacha',
      'Carlos Pellegrini'
    ],
    where: 'Calle',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp36',
    lat: -34.609026,
    lon: -58.377731,
    street: 'Piedras',
    between: [
      'Av. de Mayo',
      'H. Yrigoyen'
    ],
    where: 'Calle',
    barrio: 'Monserrat'
  },
  {
    id: 'mp37',
    lat: -34.607373,
    lon: -58.374853,
    street: 'Av. Pres. R. Sáenz Peña',
    between: [
      'Rivadavia',
      'Florida'
    ],
    where: 'Calle',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp38',
    lat: -34.606774,
    lon: -58.375961,
    street: 'Av. Pres. R. Sáenz Peña',
    between: [
      'Bartolomé Mitre',
      'Maipú'
    ],
    where: 'Calle',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp39',
    lat: -34.606418,
    lon: -58.376665,
    street: 'Av. Pres. R. Sáenz Peña',
    between: [
      'Maipú',
      'Tte. Gral. J. D. Perón'
    ],
    where: 'Calle',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp40',
    lat: -34.60566,
    lon: -58.378137,
    street: 'Av. Pres. R. Sáenz Peña',
    between: [
      'Esmeralda',
      'Suipacha'
    ],
    where: 'Calle',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp41',
    lat: -34.604941,
    lon: -58.379481,
    street: 'Av. Pres. R. Sáenz Peña',
    between: [
      'Suipacha',
      'Sarmiento'
    ],
    where: 'Calle',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp42',
    lat: -34.604612,
    lon: -58.379792,
    street: 'Av. Pres. R. Sáenz Peña',
    between: [
      'Sarmiento',
      'Carabelas'
    ],
    where: 'Calle',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp43',
    lat: -34.608099,
    lon: -58.376142,
    street: 'Rivadavia',
    between: [
      'Florida',
      'Maipú'
    ],
    where: 'Calle',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp44',
    lat: -34.608178,
    lon: -58.377595,
    street: 'Rivadavia',
    between: [
      'Maipú',
      'Esmeralda'
    ],
    where: 'Calle',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp45',
    lat: -34.608294,
    lon: -58.379488,
    street: 'Rivadavia',
    between: [
      'Suipacha',
      'Carlos Pellegrini'
    ],
    where: 'Calle',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp46',
    lat: -34.599858,
    lon: -58.374772,
    street: 'Viamonte',
    between: [
      'San Martín',
      'Florida'
    ],
    where: 'Calle',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp47',
    lat: -34.600032,
    lon: -58.377489,
    street: 'Viamonte',
    between: [
      'Maipú',
      'Esmeralda'
    ],
    where: 'Calle',
    barrio: 'San Nicolás'
  },
  {
    id: 'mp48',
    lat: -34.600141,
    lon: -58.379223,
    street: 'Viamonte',
    between: [
      'Esmeralda',
      'Suipacha'
    ],
    where: 'Calle',
    barrio: 'San Nicolás'
  }
]

export const MOTO_GARAGES = [
  {
    id: 'mc15',
    lat: -34.60799,
    lon: -58.375169,
    address: 'Av. Rivadavia 611',
    capacity: 180,
    covered: true,
    exclusive: true,
    floors: 4
  },
  {
    id: 'mc16',
    lat: -34.608008,
    lon: -58.375441,
    address: 'Av. Rivadavia 631',
    capacity: 172,
    covered: true,
    exclusive: true,
    floors: 5
  },
  {
    id: 'mc17',
    lat: -34.608163,
    lon: -58.376111,
    address: 'Av. Rivadavia 682',
    capacity: 40,
    covered: false,
    exclusive: true,
    floors: 1
  },
  {
    id: 'mc18',
    lat: -34.608108,
    lon: -58.377018,
    address: 'Av. Rivadavia 743',
    capacity: 120,
    covered: true,
    exclusive: true,
    floors: 4
  },
  {
    id: 'mc19',
    lat: -34.608287,
    lon: -58.380016,
    address: 'Av. Rivadavia 953',
    capacity: 268,
    covered: true,
    exclusive: false,
    floors: 7
  },
  {
    id: 'mc1',
    lat: -34.606587,
    lon: -58.377962,
    address: 'Esmeralda 142',
    capacity: 30,
    covered: true,
    exclusive: true,
    floors: 2
  },
  {
    id: 'mc2',
    lat: -34.604396,
    lon: -58.378096,
    address: 'Esmeralda 328',
    capacity: 50,
    covered: false,
    exclusive: true,
    floors: 1
  },
  {
    id: 'mc3',
    lat: -34.6032,
    lon: -58.378019,
    address: 'Esmeralda 425',
    capacity: 100,
    covered: true,
    exclusive: true,
    floors: 3
  },
  {
    id: 'mc4',
    lat: -34.601009,
    lon: -58.378121,
    address: 'Esmeralda 617',
    capacity: 83,
    covered: true,
    exclusive: false,
    floors: 9
  },
  {
    id: 'mc5',
    lat: -34.600768,
    lon: -58.378127,
    address: 'Esmeralda 639',
    capacity: 41,
    covered: true,
    exclusive: false,
    floors: 3
  },
  {
    id: 'mc6',
    lat: -34.600548,
    lon: -58.378132,
    address: 'Esmeralda 659',
    capacity: 23,
    covered: false,
    exclusive: true,
    floors: 1
  },
  {
    id: 'mc7',
    lat: -34.600526,
    lon: -58.378132,
    address: 'Esmeralda 661',
    capacity: 36,
    covered: false,
    exclusive: true,
    floors: 1
  },
  {
    id: 'mc8',
    lat: -34.601968,
    lon: -58.372311,
    address: 'Lavalle 385',
    capacity: 50,
    covered: true,
    exclusive: false,
    floors: 7
  },
  {
    id: 'mc9',
    lat: -34.602323,
    lon: -58.376081,
    address: 'Lavalle 658',
    capacity: 65,
    covered: true,
    exclusive: false,
    floors: 13
  },
  {
    id: 'mc10',
    lat: -34.607796,
    lon: -58.376358,
    address: 'Maipú 27',
    capacity: 138,
    covered: true,
    exclusive: false,
    floors: 24
  },
  {
    id: 'mc11',
    lat: -34.603751,
    lon: -58.376578,
    address: 'Maipú 373',
    capacity: 300,
    covered: true,
    exclusive: true,
    floors: 6
  },
  {
    id: 'mc12',
    lat: -34.600532,
    lon: -58.376846,
    address: 'Maipú 652',
    capacity: 40,
    covered: true,
    exclusive: false,
    floors: 2
  },
  {
    id: 'mc20',
    lat: -34.602398,
    lon: -58.373963,
    address: 'San Martín 478',
    capacity: 77,
    covered: true,
    exclusive: false,
    floors: 12
  },
  {
    id: 'mc21',
    lat: -34.604439,
    lon: -58.374206,
    address: 'Sarmiento 529',
    capacity: 59,
    covered: true,
    exclusive: true,
    floors: 5
  },
  {
    id: 'mc22',
    lat: -34.604647,
    lon: -58.377343,
    address: 'Sarmiento 753',
    capacity: 50,
    covered: true,
    exclusive: false,
    floors: 5
  },
  {
    id: 'mc23',
    lat: -34.60473,
    lon: -58.378612,
    address: 'Sarmiento 843',
    capacity: 137,
    covered: false,
    exclusive: true,
    floors: 1
  },
  {
    id: 'mc24',
    lat: -34.606463,
    lon: -58.379373,
    address: 'Suipacha 162',
    capacity: 67,
    covered: false,
    exclusive: true,
    floors: 1
  },
  {
    id: 'mc25',
    lat: -34.604288,
    lon: -58.379359,
    address: 'Suipacha 343',
    capacity: 7,
    covered: false,
    exclusive: true,
    floors: 1
  },
  {
    id: 'mc26',
    lat: -34.601808,
    lon: -58.379505,
    address: 'Suipacha 555',
    capacity: 62,
    covered: false,
    exclusive: true,
    floors: 1
  },
  {
    id: 'mc27',
    lat: -34.599537,
    lon: -58.379643,
    address: 'Suipacha 751',
    capacity: 49,
    covered: true,
    exclusive: false,
    floors: 2
  },
  {
    id: 'mc13',
    lat: -34.605834,
    lon: -58.375828,
    address: 'Tte. Gral. J. D. Perón 652',
    capacity: 98,
    covered: true,
    exclusive: false,
    floors: 3
  },
  {
    id: 'mc14',
    lat: -34.605987,
    lon: -58.379979,
    address: 'Tte. Gral. J. D. Perón 949',
    capacity: 310,
    covered: true,
    exclusive: false,
    floors: 16
  },
  {
    id: 'mc28',
    lat: -34.600734,
    lon: -58.371826,
    address: 'Tucumán 341',
    capacity: 50,
    covered: false,
    exclusive: true,
    floors: 1
  },
  {
    id: 'mc29',
    lat: -34.600753,
    lon: -58.372054,
    address: 'Tucumán 359',
    capacity: 40,
    covered: true,
    exclusive: true,
    floors: 9
  },
  {
    id: 'mc30',
    lat: -34.601306,
    lon: -58.378926,
    address: 'Tucumán 854',
    capacity: 47,
    covered: false,
    exclusive: true,
    floors: 1
  },
  {
    id: 'mc31',
    lat: -34.601374,
    lon: -58.380361,
    address: 'Tucumán 952',
    capacity: 79,
    covered: true,
    exclusive: false,
    floors: 5
  },
  {
    id: 'mc32',
    lat: -34.599538,
    lon: -58.371659,
    address: 'Viamonte 319',
    capacity: 40,
    covered: false,
    exclusive: true,
    floors: 1
  },
  {
    id: 'mc33',
    lat: -34.599978,
    lon: -58.376288,
    address: 'Viamonte 666',
    capacity: 29,
    covered: true,
    exclusive: true,
    floors: 2
  },
  {
    id: 'mc34',
    lat: -34.599985,
    lon: -58.376426,
    address: 'Viamonte 676',
    capacity: 67,
    covered: true,
    exclusive: false,
    floors: 4
  },
  {
    id: 'mc35',
    lat: -34.599952,
    lon: -58.377393,
    address: 'Viamonte 741',
    capacity: 52,
    covered: true,
    exclusive: true,
    floors: 5
  }
]

export const PUBLIC_LOTS_SOURCE = {
  name: 'Buenos Aires Data — Estacionamientos concesionados',
  url: 'https://data.buenosaires.gob.ar/dataset/estacionamientos-concesionados-movilidad-sustentable',
}

export const PUBLIC_LOTS = [
  {
    id: 'pc1',
    lat: -34.583907,
    lon: -58.389343,
    name: 'Facultad de Derecho',
    address: 'Facultad de Derecho',
    underground: false,
    barrio: ''
  },
  {
    id: 'pc2',
    lat: -34.594243,
    lon: -58.382224,
    name: '9 de Julio e/ Santa Fe y Juncal',
    address: '9 de Julio entre Santa Fe y Juncal',
    underground: true,
    barrio: ''
  },
  {
    id: 'pc3',
    lat: -34.604974,
    lon: -58.381526,
    name: 'Obelisco Norte',
    address: 'Av. 9 de Julio y Sarmiento',
    underground: true,
    barrio: 'San Nicolás'
  },
  {
    id: 'pc4',
    lat: -34.602556,
    lon: -58.381705,
    name: '9 de Julio y Lavalle',
    address: 'Av. 9 de Julio y Lavalle',
    underground: true,
    barrio: 'San Nicolás'
  },
  {
    id: 'pc5',
    lat: -34.614238,
    lon: -58.381054,
    name: '9 de Julio e/ Belgrano y México',
    address: '9 de Julio entre Belgrano y México',
    underground: true,
    barrio: ''
  },
  {
    id: 'pc6',
    lat: -34.598812,
    lon: -58.376834,
    name: 'Córdoba',
    address: 'Córdoba entre Florida y Esmeralda',
    underground: true,
    barrio: ''
  },
  {
    id: 'pc7',
    lat: -34.590119,
    lon: -58.381858,
    name: '9 de Julio y Posadas',
    address: 'Av. 9 de Julio y Posadas',
    underground: false,
    barrio: 'Retiro'
  },
  {
    id: 'pc8',
    lat: -34.605302,
    lon: -58.388398,
    name: 'Centro Cultural San Martín',
    address: 'Sarmiento 1537',
    underground: false,
    barrio: 'San Nicolás'
  },
  {
    id: 'pc9',
    lat: -34.609745,
    lon: -58.390676,
    name: 'Congreso (Entre Ríos e Yrigoyen)',
    address: 'Av. Entre Ríos y Hipólito Yrigoyen',
    underground: true,
    barrio: 'Monserrat'
  },
  {
    id: 'pc10',
    lat: -34.593884,
    lon: -58.389386,
    name: 'Plaza Vicente López y Planes',
    address: 'Montevideo, Paraná y Arenales',
    underground: true,
    barrio: ''
  },
  {
    id: 'pc11',
    lat: -34.588155,
    lon: -58.392186,
    name: 'Junín 1801',
    address: 'Junín 1801',
    underground: false,
    barrio: 'Recoleta'
  },
  {
    id: 'pc12',
    lat: -34.587676,
    lon: -58.453781,
    name: 'Chacarita',
    address: 'Av. Guzmán y Av. Federico Lacroze',
    underground: false,
    barrio: 'Chacarita'
  },
  {
    id: 'pc13',
    lat: -34.597445,
    lon: -58.383434,
    name: 'Plaza Libertad',
    address: 'Paraguay y Cerrito',
    underground: true,
    barrio: 'Retiro'
  },
  {
    id: 'pc14',
    lat: -34.604864,
    lon: -58.369343,
    name: 'Bouchard',
    address: 'Av. Leandro N. Alem y Sarmiento',
    underground: true,
    barrio: 'San Nicolás'
  },
  {
    id: 'pc15',
    lat: -34.603387,
    lon: -58.372949,
    name: 'Corrientes',
    address: 'Av. Corrientes 436',
    underground: false,
    barrio: 'San Nicolás'
  },
  {
    id: 'pc16',
    lat: -34.600906,
    lon: -58.384611,
    name: 'Plaza Lavalle',
    address: 'Viamonte y Talcahuano',
    underground: true,
    barrio: 'San Nicolás'
  },
  {
    id: 'pc17',
    lat: -34.596049,
    lon: -58.37608,
    name: 'Plaza San Martín',
    address: 'Av. Santa Fe y Florida',
    underground: true,
    barrio: 'Retiro'
  },
  {
    id: 'pc18',
    lat: -34.599145,
    lon: -58.398069,
    name: 'Ex Hospital de Clínicas',
    address: 'Av. Córdoba y Junín',
    underground: true,
    barrio: 'Balvanera'
  },
  {
    id: 'pc19',
    lat: -34.5903,
    lon: -58.414349,
    name: 'Charcas',
    address: 'Charcas y Jerónimo Salguero',
    underground: true,
    barrio: 'Palermo'
  },
  {
    id: 'pc20',
    lat: -34.58775,
    lon: -58.391876,
    name: 'Junín',
    address: 'Junín 1801',
    underground: true,
    barrio: 'Recoleta'
  },
  {
    id: 'pc21',
    lat: -34.579824,
    lon: -58.420388,
    name: 'Plaza Italia',
    address: 'Av. Sarmiento 2645',
    underground: true,
    barrio: 'Palermo'
  },
  {
    id: 'pc22',
    lat: -34.605761,
    lon: -58.409455,
    name: 'Jean Jaurès 371',
    address: 'Jean Jaurès 371',
    underground: false,
    barrio: 'Balvanera'
  },
  {
    id: 'pc23',
    lat: -34.60571,
    lon: -58.409776,
    name: 'Jean Jaurès 380',
    address: 'Jean Jaurès 380',
    underground: false,
    barrio: 'Balvanera'
  },
  {
    id: 'pc24',
    lat: -34.606545,
    lon: -58.408343,
    name: 'Sarmiento 2977',
    address: 'Sarmiento 2977',
    underground: false,
    barrio: 'Balvanera'
  },
  {
    id: 'pc25',
    lat: -34.611312,
    lon: -58.390595,
    name: 'Congreso',
    address: 'Adolfo Alsina 1701',
    underground: false,
    barrio: 'Monserrat'
  },
  {
    id: 'pc26',
    lat: -34.601215,
    lon: -58.399145,
    name: 'Ciencias Económicas',
    address: 'Viamonte 2242',
    underground: false,
    barrio: 'Balvanera'
  },
  {
    id: 'pc27',
    lat: -34.571646,
    lon: -58.431595,
    name: 'Las Cañitas',
    address: 'Báez 351',
    underground: false,
    barrio: 'Palermo'
  },
  {
    id: 'pc28',
    lat: -34.606307,
    lon: -58.379186,
    name: 'Microcentro I',
    address: 'Suipacha 153',
    underground: false,
    barrio: 'San Nicolás'
  },
  {
    id: 'pc29',
    lat: -34.603537,
    lon: -58.376436,
    name: 'Microcentro II',
    address: 'Av. Corrientes 680',
    underground: false,
    barrio: 'San Nicolás'
  },
  {
    id: 'pc30',
    lat: -34.603206,
    lon: -58.377975,
    name: 'Microcentro III',
    address: 'Esmeralda 425',
    underground: false,
    barrio: 'San Nicolás'
  },
  {
    id: 'pc31',
    lat: -34.613439,
    lon: -58.383598,
    name: 'Monserrat',
    address: 'Av. Belgrano 1216',
    underground: false,
    barrio: 'Monserrat'
  },
  {
    id: 'pc32',
    lat: -34.612704,
    lon: -58.381964,
    name: 'Monserrat II',
    address: 'Lima 359',
    underground: false,
    barrio: 'Monserrat'
  },
  {
    id: 'pc33',
    lat: -34.554123,
    lon: -58.453275,
    name: 'Núñez',
    address: 'Arribeños 2511',
    underground: false,
    barrio: 'Belgrano'
  },
  {
    id: 'pc34',
    lat: -34.603537,
    lon: -58.401681,
    name: 'Once',
    address: 'Lavalle 2454',
    underground: false,
    barrio: 'Balvanera'
  },
  {
    id: 'pc35',
    lat: -34.605207,
    lon: -58.400896,
    name: 'Once II',
    address: 'Azcuénaga 376',
    underground: false,
    barrio: 'Balvanera'
  },
  {
    id: 'pc36',
    lat: -34.602977,
    lon: -58.402393,
    name: 'Once Larrea',
    address: 'Larrea 548',
    underground: false,
    barrio: 'Balvanera'
  },
  {
    id: 'pc37',
    lat: -34.578108,
    lon: -58.413011,
    name: 'Palermo I',
    address: 'Lafinur 3250',
    underground: false,
    barrio: 'Palermo'
  },
  {
    id: 'pc38',
    lat: -34.578777,
    lon: -58.419029,
    name: 'Palermo II',
    address: 'Av. Sarmiento 2720',
    underground: false,
    barrio: 'Palermo'
  },
  {
    id: 'pc39',
    lat: -34.58904,
    lon: -58.426922,
    name: 'Palermo Soho',
    address: 'Armenia 1728',
    underground: false,
    barrio: 'Palermo'
  },
  {
    id: 'pc40',
    lat: -34.604401,
    lon: -58.389987,
    name: 'Paseo La Plaza',
    address: 'Av. Corrientes 1640',
    underground: false,
    barrio: 'San Nicolás'
  },
  {
    id: 'pc41',
    lat: -34.605841,
    lon: -58.3672,
    name: 'Puerto Madero I',
    address: 'Av. Alicia Moreau de Justo 741',
    underground: false,
    barrio: 'Puerto Madero'
  },
  {
    id: 'pc42',
    lat: -34.613872,
    lon: -58.366401,
    name: 'Puerto Madero IV',
    address: 'Av. Alicia Moreau de Justo 1301',
    underground: false,
    barrio: 'Puerto Madero'
  },
  {
    id: 'pc43',
    lat: -34.615707,
    lon: -58.366204,
    name: 'Puerto Madero V',
    address: 'Av. Alicia Moreau de Justo 1501',
    underground: false,
    barrio: 'Puerto Madero'
  },
  {
    id: 'pc44',
    lat: -34.617724,
    lon: -58.365984,
    name: 'Puerto Madero VI',
    address: 'Av. Alicia Moreau de Justo 1681',
    underground: false,
    barrio: 'Puerto Madero'
  },
  {
    id: 'pc45',
    lat: -34.619442,
    lon: -58.365799,
    name: 'Puerto Madero VII',
    address: 'Av. Alicia Moreau de Justo 1700',
    underground: false,
    barrio: 'Puerto Madero'
  },
  {
    id: 'pc46',
    lat: -34.596209,
    lon: -58.384368,
    name: 'Recoleta I',
    address: 'Libertad 1058',
    underground: false,
    barrio: 'Retiro'
  },
  {
    id: 'pc47',
    lat: -34.595939,
    lon: -58.400096,
    name: 'Recoleta II',
    address: 'Azcuénaga 1048',
    underground: false,
    barrio: 'Recoleta'
  },
  {
    id: 'pc48',
    lat: -34.596916,
    lon: -58.374373,
    name: 'Retiro',
    address: 'San Martín 940',
    underground: false,
    barrio: 'Retiro'
  },
  {
    id: 'pc49',
    lat: -34.60777,
    lon: -58.387592,
    name: 'Congreso II',
    address: 'Bartolomé Mitre 1490',
    underground: false,
    barrio: 'San Nicolás'
  }
]
