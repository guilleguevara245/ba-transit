import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleanPlace, findStationPlace, mergePlaces, placePhrase, sanitizePlaces, savePlace } from './placesStore.js'

test('cleanPlace valida y normaliza', () => {
  assert.equal(cleanPlace({ tipo: 'gym', estacion: 1 }), null)
  assert.equal(cleanPlace({ tipo: 'otro', direccion: '   ' }), null)
  assert.deepEqual(cleanPlace({ tipo: 'casa', nombre: 'x', estacion: 5, direccion: 'Calle 1' }), {
    tipo: 'casa',
    nombre: 'Casa',
    estacion: 5,
    direccion: null,
  })
  assert.deepEqual(cleanPlace({ tipo: 'otro', nombre: ' ', direccion: 'Av.\n  Corrientes   1500 ' }), {
    tipo: 'otro',
    nombre: 'Lugar',
    estacion: null,
    direccion: 'Av. Corrientes 1500',
  })
  assert.equal(cleanPlace({ tipo: 'otro', nombre: 'a'.repeat(99), estacion: 2 }).nombre.length, 30)
})

test('sanitizePlaces: una Casa, un Trabajo, primero ellos y como mucho 8', () => {
  const list = sanitizePlaces([
    { tipo: 'otro', nombre: 'Club', estacion: 9 },
    { tipo: 'trabajo', estacion: 2 },
    { tipo: 'casa', estacion: 1 },
    { tipo: 'casa', estacion: 3 },
  ])
  assert.deepEqual(
    list.map((p) => [p.tipo, p.estacion]),
    [
      ['casa', 1],
      ['trabajo', 2],
      ['otro', 9],
    ],
  )
  const many = Array.from({ length: 20 }, (_, i) => ({ tipo: 'otro', nombre: `L${i}`, estacion: i + 1 }))
  assert.equal(sanitizePlaces(many).length, 8)
  assert.deepEqual(sanitizePlaces('basura'), [])
})

test('savePlace reemplaza Casa y edita por posicion', () => {
  let list = savePlace([], { tipo: 'casa', estacion: 1 })
  list = savePlace(list, { tipo: 'otro', nombre: 'Club', estacion: 7 })
  list = savePlace(list, { tipo: 'casa', direccion: 'Calle 2' })
  assert.equal(list.length, 2)
  assert.equal(list[0].direccion, 'Calle 2')
  list = savePlace(list, { tipo: 'otro', nombre: 'Gimnasio', estacion: 8 }, 1)
  assert.deepEqual(
    list.map((p) => p.nombre),
    ['Casa', 'Gimnasio'],
  )
})

test('mergePlaces: con la cuenta ya sincronizada manda la cuenta', () => {
  const local = [{ tipo: 'casa', estacion: 1 }, { tipo: 'trabajo', estacion: 2 }]
  const remote = [{ tipo: 'casa', estacion: 5 }]
  assert.deepEqual(
    mergePlaces(local, remote, true).map((p) => p.estacion),
    [5],
  )
  // La primera vez se suman, con prioridad de la cuenta.
  assert.deepEqual(
    mergePlaces([...local, { tipo: 'otro', nombre: 'A', estacion: 9 }], [...remote, { tipo: 'otro', nombre: 'B', estacion: 9 }], false).map(
      (p) => [p.tipo, p.estacion, p.nombre],
    ),
    [
      ['casa', 5, 'Casa'],
      ['trabajo', 2, 'Trabajo'],
      ['otro', 9, 'B'],
    ],
  )
})

test('findStationPlace y frases', () => {
  const options = [
    { stationId: 'lugar-1', stations: [{ stationId: 1 }, { stationId: 4 }] },
    { stationId: 'lugar-2', stations: [{ stationId: 2 }] },
  ]
  assert.equal(findStationPlace(options, 4).stationId, 'lugar-1')
  assert.equal(findStationPlace(options, 99), null)
  assert.equal(findStationPlace(options, null), null)
  assert.equal(`${placePhrase({ tipo: 'casa' }, 'de')} ${placePhrase({ tipo: 'trabajo' }, 'a')}`, 'De casa al trabajo')
  assert.equal(placePhrase({ tipo: 'otro', nombre: 'Club' }, 'a'), 'a Club')
})
