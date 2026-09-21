import { useEffect, useRef, useState } from 'react'
import { apiGet } from '../api.js'
import { useDebounce } from '../hooks/useDebounce.js'
import './SearchBar.css'

const MIN_CHARS = 2

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  const debouncedQuery = useDebounce(query.trim(), 300)

  useEffect(() => {
    if (debouncedQuery.length < MIN_CHARS) {
      setResults(null)
      return
    }

    let cancelled = false
    apiGet(`/api/v1/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((data) => {
        if (!cancelled) {
          setResults(data)
          setOpen(true)
        }
      })
      .catch(() => {
        if (!cancelled) setResults(null)
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

  const hasResults = results && (results.lines.length > 0 || results.stations.length > 0)

  return (
    <div className="search-wrap" ref={containerRef}>
      <div className="search-box">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Buscar líneas, estaciones o paradas"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            if (results) setOpen(true)
          }}
        />
      </div>

      {open && debouncedQuery.length >= MIN_CHARS && (
        <div className="search-results">
          {!hasResults && <div className="search-empty">Sin resultados para "{debouncedQuery}"</div>}

          {results && results.lines.length > 0 && (
            <>
              <div className="search-section-label">Líneas</div>
              {results.lines.map((line) => (
                <div className="search-result-row" key={`line-${line.id}`}>
                  <span className="result-dot" style={{ background: line.colorHex }}></span>
                  <span className="result-name">{line.name}</span>
                </div>
              ))}
            </>
          )}

          {results && results.stations.length > 0 && (
            <>
              <div className="search-section-label">Estaciones</div>
              {results.stations.map((station) => (
                <div className="search-result-row" key={`station-${station.stationId}`}>
                  <span className="result-dot" style={{ background: station.lineColorHex }}></span>
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
