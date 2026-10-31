import { useId, useState } from 'react'
import { MAX_ADDRESS } from '../utils/placesStore.js'
import { distanceText } from '../utils/addressSearch.js'
import './AddressField.css'

const ICONS = {
  pin: 'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  ok: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-4 9.5 2.7 2.7L16 9.8',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 8v5m0-8h.01',
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM20 20l-4.8-4.8',
}

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={ICONS[name]} />
    </svg>
  )
}

/** El renglon de abajo del campo: que paso con la busqueda o con la direccion elegida. */
function Status({ picked, near, status }) {
  if (picked) {
    return (
      <p className="address-status address-status-ok" role="status">
        <Icon name="ok" />
        <span>
          <strong>Dirección confirmada</strong>
          {near ? (
            <>
              Estación más cercana: {near.name}
              {near.km != null && `, ${distanceText(near.km)}`}
            </>
          ) : (
            'No hay estaciones a menos de 3 km: el viaje se abre en Google Maps.'
          )}
        </span>
      </p>
    )
  }
  const text = {
    idle: ['info', 'Escribí la calle y la altura, por ejemplo Av. Corrientes 1500.'],
    loading: ['search', 'Buscando la dirección…'],
    results: ['info', 'Elegí tu dirección de la lista para confirmarla.'],
    empty: ['info', 'No la encontramos en el AMBA. Revisá la calle y la altura.'],
    error: ['info', 'No pudimos verificarla ahora. Podés guardarla igual y confirmarla más tarde.'],
  }[status]
  return (
    <p className={`address-status address-status-${status}`} role="status">
      <Icon name={text[0]} />
      <span>{text[1]}</span>
    </p>
  )
}

/**
 * Campo de direccion con sugerencias de Georef: al escribir calle y altura
 * aparece la lista de direcciones del AMBA que coinciden, y al elegir una
 * queda confirmada. Se maneja con el teclado (flechas, Enter, Escape).
 *
 * value/onChange: el texto. search: { status, results } de useAddressSearch.
 * picked: la direccion confirmada (o null); near: { name, km } de su
 * estacion mas cercana. onPick(address): se eligio una de la lista.
 */
export default function AddressField({ value, onChange, search, picked, near, onPick }) {
  const id = useId()
  const listId = `${id}-lista`
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const results = picked ? [] : search.results
  const showList = open && results.length > 0 && search.status !== 'idle'

  function choose(address) {
    onPick(address)
    setOpen(false)
  }

  function onKeyDown(event) {
    if (!showList) {
      if (event.key === 'ArrowDown' && results.length > 0) setOpen(true)
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (i + step + results.length) % results.length)
    } else if (event.key === 'Enter') {
      // Enter elige la sugerencia en lugar de mandar el formulario.
      event.preventDefault()
      choose(results[Math.min(active, results.length - 1)])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="auth-field address-field">
      <label htmlFor={`${id}-input`}>Dirección</label>
      <div className="address-input-wrap">
        <Icon name="pin" />
        <input
          id={`${id}-input`}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList ? `${id}-op-${active}` : undefined}
          autoComplete="off"
          value={value}
          maxLength={MAX_ADDRESS}
          placeholder="Av. Corrientes 1500"
          onChange={(e) => {
            onChange(e.target.value)
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        {showList && (
          <ul className="address-options" id={listId} role="listbox" aria-label="Direcciones encontradas">
            {results.map((address, i) => (
              <li
                key={`${address.text}-${address.area}`}
                id={`${id}-op-${i}`}
                role="option"
                aria-selected={i === active}
                className={i === active ? 'active' : ''}
                // mousedown (antes del blur del campo) para que la lista no se cierre antes del click.
                onMouseDown={(e) => {
                  e.preventDefault()
                  choose(address)
                }}
                onMouseEnter={() => setActive(i)}
              >
                <Icon name="pin" />
                <span>
                  <strong>{address.text}</strong>
                  <small>{address.area}</small>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Status picked={picked} near={near} status={search.status} />
    </div>
  )
}
