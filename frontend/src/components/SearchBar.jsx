import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../api.js'
import { useDebounce } from '../hooks/useDebounce.js'
import { moveActiveIndex, toSearchOptions } from '../utils/search.js'
import './SearchBar.css'

const MIN_CHARS = 2

/**
 * Buscador con desplegable navegable (patron "combobox" de ARIA):
 * flechas para moverse, Enter para abrir el resultado, Escape para
 * cerrar. Una linea lleva a su pagina; una estacion, a la pagina de
 * su linea con la estacion resaltada; un colectivo, a su recorrido.
 */
export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [buses, setBuses] = useState(null)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef(null)
  const navigate = useNavigate()
  const listboxId = useId()

  const debouncedQuery = useDebounce(query.trim(), 300)
  const options = toSearchOptions(results, buses, debouncedQuery)

  useEffect(() => {
    if (debouncedQuery.length < MIN_CHARS) {
      setResults(null)
      setBuses(null)
      return
    }

    let cancelled = false
    const q = encodeURIComponent(debouncedQuery)
    // Lineas y estaciones, y en paralelo las lineas de colectivo ("Línea 53" busca lo mismo que "53").
    // Si los colectivos no estan disponibles, se muestra lo demas.
    const busQuery = encodeURIComponent(debouncedQuery.replace(/^l[ií]nea\s*/i, ''))
    Promise.all([
      apiGet(`/api/v1/search?q=${q}`).catch(() => null),
      apiGet(`/api/v1/colectivos?q=${busQuery}`).catch(() => null),
    ]).then(([data, busData]) => {
      if (cancelled) return
      setResults(data)
      setBuses(Array.isArray(busData) ? busData : null)
      setActiveIndex(-1)
      setOpen(true)
    })

    return () => {
      cancelled = true
    }
  }, [debouncedQuery])

  // Cierra el desplegable si el usuario hace click afuera del buscador.
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function choose(option) {
    setOpen(false)
    setQuery('')
    setResults(null)
    setBuses(null)
    navigate(option.href)
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((current) => moveActiveIndex(current, event.key === 'ArrowDown' ? 1 : -1, options.length))
    } else if (event.key === 'Enter') {
      const option = options[activeIndex] ?? (options.length === 1 ? options[0] : null)
      if (option) {
        event.preventDefault()
        choose(option)
      }
    } else if (event.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  const showDropdown = open && debouncedQuery.length >= MIN_CHARS
  const activeOption = showDropdown ? options[activeIndex] : undefined

  return (
    <div className="search-wrap" ref={containerRef}>
      <div className="search-box">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          role="combobox"
          aria-label="Buscar líneas, estaciones o colectivos"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-activedescendant={activeOption ? `${listboxId}-${activeOption.key}` : undefined}
          placeholder="Buscar líneas, estaciones o colectivos"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            if (results || buses) setOpen(true)
          }}
          onKeyDown={handleKeyDown}
        />
      </div>

      {showDropdown && (
        <div className="search-results" id={listboxId} role="listbox">
          {options.length === 0 && <div className="search-empty">Sin resultados para “{debouncedQuery}”</div>}

          {options.map((option, index) => (
            <div key={option.key}>
              {(index === 0 || options[index - 1].group !== option.group) && (
                <div className="search-section-label" role="presentation">
                  {option.group}
                </div>
              )}
              <div
                id={`${listboxId}-${option.key}`}
                role="option"
                aria-selected={index === activeIndex}
                className={index === activeIndex ? 'search-result-row active' : 'search-result-row'}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(option)}
              >
                {option.group === 'Colectivos' ? (
                  <span className="result-bus" style={{ background: option.color }}>
                    {option.name.replace(/^Línea\s+/, '').replace(' · Cartel ', '')}
                  </span>
                ) : (
                  <span className="result-dot" style={{ background: option.color }}></span>
                )}
                <span className="result-name">{option.name}</span>
                <span className="result-meta">{option.meta}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
