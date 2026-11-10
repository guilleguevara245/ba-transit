import { describe, expect, it } from 'vitest'
import { CONTACT_KINDS, MAX_LENGTH, MIN_LENGTH, contactProblem } from './contact.js'

const ok = {
  name: 'Ana',
  lastName: 'Pérez',
  email: 'ana@gmail.com',
  kind: 'error',
  message: 'El mapa no carga en la línea B',
}

describe('contactProblem', () => {
  it('acepta un mensaje completo', () => {
    expect(contactProblem(ok)).toBeNull()
    expect(contactProblem({ ...ok, email: ' ana@gmail.com ' })).toBeNull()
  })

  it('pide nombre y apellido', () => {
    expect(contactProblem({ ...ok, name: '  ' })?.field).toBe('name')
    expect(contactProblem({ ...ok, lastName: '' })?.field).toBe('lastName')
  })

  it('marca los problemas en el orden del formulario', () => {
    expect(contactProblem({ ...ok, name: '', email: '', kind: '', message: '' })?.field).toBe('name')
    expect(contactProblem({ ...ok, email: 'ana@', kind: '' })?.field).toBe('email')
  })

  it('pide elegir de qué se trata', () => {
    expect(contactProblem({ ...ok, kind: '' })?.field).toBe('kind')
    expect(contactProblem({ ...ok, kind: 'queja' })?.field).toBe('kind')
  })

  it('pide un mensaje ni muy corto ni muy largo (sin contar los espacios de los bordes)', () => {
    expect(contactProblem({ ...ok, message: `   ${'a'.repeat(MIN_LENGTH - 1)}   ` })?.field).toBe('message')
    expect(contactProblem({ ...ok, message: 'a'.repeat(MIN_LENGTH) })).toBeNull()
    expect(contactProblem({ ...ok, message: 'a'.repeat(MAX_LENGTH + 1) })?.text).toContain('muy largo')
  })

  it('pide un mail válido', () => {
    expect(contactProblem({ ...ok, email: '   ' })?.text).toContain('tu mail')
    expect(contactProblem({ ...ok, email: 'ana@' })?.field).toBe('email')
    expect(contactProblem({ ...ok, email: 'ana gmail.com' })?.field).toBe('email')
  })

  it('los tipos son los que entiende el servidor', () => {
    expect(CONTACT_KINDS.map((k) => k.value)).toEqual(['error', 'idea', 'otro'])
  })
})
