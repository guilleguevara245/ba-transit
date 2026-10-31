import { useEffect, useId, useMemo, useRef, useState } from 'react'
import PlaceIcon from './PlaceIcon.jsx'
import TripIcon from './TripIcon.jsx'
import { useAddressSearch } from '../hooks/useAddressSearch.js'
import { addressText, distanceText, nearestStation } from '../utils/addressSearch.js'
import { MAX_ACCESS_KM, isAddress } from '../utils/planner.js'
import { moveActiveIndex } from '../utils/search.js'
import { matchStations, normalizeText } from '../utils/stationSearch.js'
import './SearchBar.css'
import './StationPicker.css'

/** Un punto de color por linea (Retiro tiene cinco). */
function Dots({ colors }) {
  return (
    <span className="station-picker-dots" aria-hidden="true">
      {colors.map((color, index) => (
        <span key={`${color}-${index}`} className="result-dot" style={{ background: color }} />
      ))}
    </span>
  )
}

/** El texto del campo para lo elegido: el nombre de la estacion o la direccion. */
const labelOf = (value) => (!value ? '' : isAddress(value) ? addressText(value) : value.stationName)

/** Una direccion se busca recien cuando tiene altura (un numero): asi no se consulta Georef por cada estacion. */
const looksLikeAddress = (text) => /\d/.test(text)

/** "Ciudad de Buenos Aires · a 300 m de Medrano": donde queda y su estacion mas cercana. */
function addressMeta(address, stations) {
  const near = nearestStation(stations, address, MAX_ACCESS_KM)
  const where = near ? `${distanceText(near.km)} de ${near.option.stationName}` : 'sin estaciones cerca'
  return address.area ? `${address.area} · ${where}` : where
}

/** Debajo de una direccion elegida: la estacion mas cercana (o que no hay ninguna). */
function AddressHint({ address, stations }) {
  const near = nearestStation(stations, address, MAX_ACCESS_KM)
  return (
    <p className={near ? 'station-picker-hint' : 'station-picker-hint far'}>
      <TripIcon name={near ? 'walk' : 'info'} />
      {near ? (
        <span>
          Estación más cercana: <b>{near.option.stationName}</b>, {distanceText(near.km)}
        </span>
      ) : (
        <span>No hay estaciones a menos de {MAX_ACCESS_KM} km</span>
      )}
    </p>
  )
}

/** El renglon de las direcciones mientras se buscan, o si no se encontraron. */
const ADDRESS_STATUS = {
  idle: 'Seguí escribiendo la calle y la altura.',
  loading: 'Buscando direcciones…',
  empty: 'No encontramos esa dirección en el AMBA. Revisá la calle y la altura.',
  error: 'No pudimos buscar direcciones ahora. Elegí una estación o probá en un rato.',
}

/**
 * Campo para elegir una estacion, con el mismo desplegable que el
 * buscador del inicio (flechas, Enter y Escape). Reemplaza al
 * <datalist> nativo, que cada navegador dibuja a su manera.
 *
 * shortcuts (opcional): lugares guardados ({ key, tipo, nombre, option })
 * que se muestran como chips debajo del campo mientras esta vacio.
 *
 * withAddresses (opcional): tambien acepta direcciones. Al escribir calle
 * y altura aparecen, debajo de las estaciones, las direcciones del AMBA
 * que encuentra Georef (a traves del servidor), cada una con su estacion
 * mas cercana. Lo elegido llega a onChange como { type: 'address', text,
 * area, lat, lon }; las coordenadas quedan en el navegador.
 */
export default function StationPicker({ id, title, stations, value, onChange, shortcuts = [], withAddresses = false }) {
  const [text, setText] = useState(labelOf(value))
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef(null)
  const listboxId = useId()
  const typingRef = useRef(false)

  // Si lo elegido cambia desde afuera (boton de invertir), se actualiza
  // el texto. Si se borro porque el usuario esta escribiendo, no.
  useEffect(() => {
    if (typingRef.current) {
      typingRef.current = false
      return
    }
    setText(labelOf(value))
  }, [value])

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const wantsAddresses = withAddresses && !value && looksLikeAddress(text)
  const addressSearch = useAddressSearch(text, wantsAddresses)
  const stationOptions = useMemo(() => matchStations(stations, text), [stations, text])
  const options = useMemo(() => {
    const list = stationOptions.map((station) => ({ key: station.stationId, station }))
    if (wantsAddresses) {
      addressSearch.results.forEach((result, index) => {
        list.push({ key: `direccion-${index}`, address: { type: 'address', ...result } })
      })
    }
    return list
  }, [stationOptions, wantsAddresses, addressSearch.results])

  const showDropdown = open && normalizeText(text).length > 0 && !(value && text === labelOf(value))
  const activeOption = showDropdown ? options[activeIndex] : undefined
  const addressCount = options.length - stationOptions.length
  // Si ya aparece una estacion ("9 de Julio"), no se avisa que no hay direcciones.
  const showAddresses = wantsAddresses && (addressCount > 0 || stationOptions.length === 0)
  const addressStatus = showAddresses && addressCount === 0 ? ADDRESS_STATUS[addressSearch.status] : null

  function choose(option) {
    const picked = option.address ?? option.station ?? option
    onChange(picked)
    setText(labelOf(picked))
    setOpen(false)
    setActiveIndex(-1)
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((current) => moveActiveIndex(current, event.key === 'ArrowDown' ? 1 : -1, options.length))
    } else if (event.key === 'Enter') {
      const option = options[activeIndex] ?? (options.length === 1 ? options[0] : null)
      if (option && showDropdown) {
        event.preventDefault()
        choose(option)
      }
    } else if (event.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  const row = (option, index, content) => (
    <div
      key={option.key}
      id={`${listboxId}-${option.key}`}
      role="option"
      aria-selected={index === activeIndex}
      className={index === activeIndex ? 'search-result-row active' : 'search-result-row'}
      onMouseEnter={() => setActiveIndex(index)}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => choose(option)}
    >
      {content}
    </div>
  )

  const chosenAddress = isAddress(value)

  return (
    <div className="planner-field station-picker" ref={containerRef}>
      <label htmlFor={id}>{title}</label>
      <div className={value ? 'station-picker-box chosen' : 'station-picker-box'}>
        {value && !chosenAddress && <Dots colors={value.colors ?? [value.lineColorHex]} />}
        {chosenAddress && <TripIcon name="pin" className="station-picker-pin" />}
        <input
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-activedescendant={activeOption ? `${listboxId}-${activeOption.key}` : undefined}
          placeholder={withAddresses ? 'Estación o dirección (calle y altura)' : 'Escribí una estación'}
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setOpen(true)
            setActiveIndex(-1)
            if (value) {
              typingRef.current = true
              onChange(null)
            }
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {value && <span className="station-picker-line">{chosenAddress ? 'Dirección' : value.lineName}</span>}
      </div>

      {chosenAddress && <AddressHint address={value} stations={stations} />}

      {!value && shortcuts.length > 0 && (
        <div className="place-chips" role="group" aria-label={`Mis lugares para ${title.toLowerCase()}`}>
          {shortcuts.map((s) => (
            <button key={s.key} type="button" className="place-chip" onClick={() => choose(s.option)}>
              <PlaceIcon tipo={s.tipo} size="sm" />
              {s.nombre}
            </button>
          ))}
        </div>
      )}

      {showDropdown && (
        <div className="search-results station-picker-results" id={listboxId} role="listbox">
          {stationOptions.length > 0 && (
            <>
              <div className="search-section-label" role="presentation">
                Estaciones
              </div>
              {options.slice(0, stationOptions.length).map((option, index) =>
                row(
                  option,
                  index,
                  <>
                    <Dots colors={option.station.colors ?? [option.station.lineColorHex]} />
                    <span className="result-name">{option.station.stationName}</span>
                    <span className="result-meta">{option.station.lineName}</span>
                  </>,
                ),
              )}
            </>
          )}
          {showAddresses && (
            <>
              <div className="search-section-label" role="presentation">
                Direcciones
              </div>
              {options.slice(stationOptions.length).map((option, i) =>
                row(
                  option,
                  stationOptions.length + i,
                  <>
                    <TripIcon name="pin" className="station-picker-pin" />
                    <span className="result-name">{option.address.text}</span>
                    <span className="result-meta">{addressMeta(option.address, stations)}</span>
                  </>,
                ),
              )}
              {addressStatus && (
                <div className="search-empty" role="status">
                  {addressStatus}
                </div>
              )}
            </>
          )}
          {options.length === 0 && !wantsAddresses && (
            <div className="search-empty">
              Sin estaciones para “{text.trim()}”
              {withAddresses && '. Para una dirección, escribí la calle y la altura.'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
