import { useEffect, useId, useMemo, useRef, useState } from 'react'
import PlaceIcon from './PlaceIcon.jsx'
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

/**
 * Campo para elegir una estacion, con el mismo desplegable que el
 * buscador del inicio (flechas, Enter y Escape). Reemplaza al
 * <datalist> nativo, que cada navegador dibuja a su manera.
 *
 * shortcuts (opcional): lugares guardados ({ key, tipo, nombre, option })
 * que se muestran como chips debajo del campo mientras esta vacio.
 */
export default function StationPicker({ id, title, stations, value, onChange, shortcuts = [] }) {
  const [text, setText] = useState(value ? value.stationName : '')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef(null)
  const listboxId = useId()
  const typingRef = useRef(false)

  // Si la estacion cambia desde afuera (boton de invertir), se actualiza
  // el texto. Si se borro porque el usuario esta escribiendo, no.
  useEffect(() => {
    if (typingRef.current) {
      typingRef.current = false
      return
    }
    setText(value ? value.stationName : '')
  }, [value])

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const options = useMemo(() => matchStations(stations, text), [stations, text])
  const showDropdown = open && normalizeText(text).length > 0 && !(value && text === value.stationName)
  const activeOption = showDropdown ? options[activeIndex] : undefined

  function choose(station) {
    onChange(station)
    setText(station.stationName)
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

  return (
    <div className="planner-field station-picker" ref={containerRef}>
      <label htmlFor={id}>{title}</label>
      <div className={value ? 'station-picker-box chosen' : 'station-picker-box'}>
        {value && <Dots colors={value.colors ?? [value.lineColorHex]} />}
        <input
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-activedescendant={activeOption ? `${listboxId}-${activeOption.stationId}` : undefined}
          placeholder="Escribí una estación"
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
        {value && <span className="station-picker-line">{value.lineName}</span>}
      </div>

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
          {options.length === 0 ? (
            <div className="search-empty">Sin estaciones para “{text.trim()}”</div>
          ) : (
            <>
              <div className="search-section-label" role="presentation">
                Estaciones
              </div>
              {options.map((station, index) => (
                <div
                  key={station.stationId}
                  id={`${listboxId}-${station.stationId}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={index === activeIndex ? 'search-result-row active' : 'search-result-row'}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(station)}
                >
                  <Dots colors={station.colors ?? [station.lineColorHex]} />
                  <span className="result-name">{station.stationName}</span>
                  <span className="result-meta">{station.lineName}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
