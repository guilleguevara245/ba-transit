import { describe, expect, it } from 'vitest'
import {
  alertsForBus,
  busDescription,
  busFavoriteId,
  busParams,
  busTitle,
  headsignName,
  headsignTo,
  movingLabel,
  parseBusShortName,
  plainText,
  operatorName,
  stopName,
} from './busNames.js'

describe('parseBusShortName', () => {
  it('separa numero y cartel', () => {
    expect(parseBusShortName('53A')).toEqual({ number: '53', sign: 'A' })
    expect(parseBusShortName('152')).toEqual({ number: '152', sign: '' })
    expect(parseBusShortName('X1')).toEqual({ number: 'X1', sign: '' })
  })
})

describe('busTitle', () => {
  it('arma el titulo con el cartel', () => {
    expect(busTitle({ shortName: '53A' })).toBe('Línea 53 · Cartel A')
    expect(busTitle({ shortName: '152' })).toBe('Línea 152')
  })
})

describe('busDescription', () => {
  it('oculta los codigos internos del feed', () => {
    expect(busDescription({ shortName: '53A', longName: 'JNAMBA053' })).toBeNull()
    expect(busDescription({ shortName: '532A', longName: 'JMLDZM532' })).toBeNull()
    expect(busDescription({ shortName: '8', longName: 'Retiro - Ezeiza' })).toBe('Retiro - Ezeiza')
  })
})

describe('stopName', () => {
  it('saca el numero interno y pasa de mayusculas a nombre propio', () => {
    expect(stopName('1302 ANTARTIDA ARGENTINA AV.')).toBe('Antartida Argentina Av.')
    expect(stopName('AV. DE MAYO Y PERU')).toBe('Av. de Mayo y Peru')
    expect(stopName('Plaza Italia')).toBe('Plaza Italia')
  })
})

describe('busParams', () => {
  it('pone el numero a la vista y el id aparte', () => {
    expect(busParams('53A', '283')).toEqual({ linea: '53A', id: '283' })
    expect(busParams(null, '283')).toEqual({ linea: '283' })
  })
})

describe('colectivos favoritos', () => {
  it('busFavoriteId normaliza el cartel', () => {
    expect(busFavoriteId(' 53a')).toBe('53A')
    expect(busFavoriteId('152')).toBe('152')
    expect(busFavoriteId('no vale!')).toBeNull()
    expect(busFavoriteId(null)).toBeNull()
  })

  it('movingLabel', () => {
    expect(movingLabel(null)).toBeNull()
    expect(movingLabel(0)).toBe('Ninguno en la calle ahora')
    expect(movingLabel(1234)).toBe('1.234 en la calle ahora')
  })

  it('alertsForBus busca por numero, sin cartel', () => {
    const alerts = [
      { title: 'a', lines: ['53', '60'] },
      { title: 'b', lines: ['7'] },
    ]
    expect(alertsForBus(alerts, '53A').map((a) => a.title)).toEqual(['a'])
    expect(alertsForBus(alerts, '007').map((a) => a.title)).toEqual(['b'])
    expect(alertsForBus(undefined, '152')).toEqual([])
  })
})

describe('headsignTo', () => {
  it('saca la "a" del principio', () => {
    expect(headsignTo('A EST. MORÓN')).toBe('EST. MORON')
    expect(headsignTo('A EST. MORÃ³N')).toBe('EST. MORON')
    expect(headsignTo('a Est. Lanus')).toBe('Est. Lanus')
    expect(headsignTo('Alem')).toBe('Alem')
    expect(headsignTo(null)).toBe('')
  })
})

describe('plainText', () => {
  it('rearma lo mal codificado y saca los acentos', () => {
    expect(plainText('EST. MORÃ³N')).toBe('EST. MORON')
    expect(plainText('CAÃ‘UELAS')).toBe('CANUELAS')
    expect(plainText('Estación Constitución')).toBe('Estacion Constitucion')
    expect(plainText('  Av.   Corrientes ')).toBe('Av. Corrientes')
    expect(plainText(null)).toBe('')
  })
})

describe('operatorName', () => {
  it('pasa la empresa a minusculas y deja las siglas de sociedad', () => {
    expect(operatorName('EMPRESA DEL OESTE SAT')).toBe('Empresa del Oeste SAT')
    expect(operatorName('MICRO OMNIBUS NORTE S.A.')).toBe('Micro Omnibus Norte S.A.')
    expect(operatorName('LA CENTRAL DE VICENTE LOPEZ SACI')).toBe('La Central de Vicente Lopez SACI')
  })

  it('deja como vienen las siglas sueltas y los nombres ya escritos bien', () => {
    expect(operatorName('MOTCB')).toBe('MOTCB')
    expect(operatorName('Transportes Sur Nuevo SA')).toBe('Transportes Sur Nuevo SA')
  })
})

describe('headsignName', () => {
  it('saca la "a" y las mayusculas del destino', () => {
    expect(headsignName('A EST. MORON')).toBe('Est. Moron')
    expect(headsignName('Ramal 14 - IDA')).toBe('Ramal 14 - IDA')
    expect(headsignName('A COLECTORA PTA. 2 FORD')).toBe('Colectora Pta. 2 Ford')
  })
})
