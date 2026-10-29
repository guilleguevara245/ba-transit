import { useEffect, useId, useRef, useState } from 'react'
import { moveActiveIndex } from '../utils/search.js'
import './SearchBar.css'
import './Select.css'

/**
 * Desplegable propio con la estetica del buscador, en lugar del
 * <select> nativo (que cada navegador y sistema dibuja distinto).
 * Sigue el patron "listbox" de ARIA: Enter, Espacio o flechas abren,
 * flechas recorren, Enter elige, Escape cierra y una letra salta a la
 * primera opcion que empieza con ella.
 *
 * options: [{ value, label, color?, meta? }]
 */
const LIST_MAX_HEIGHT = 280

export default function Select({ value, options, onChange, label, labelledBy, placeholder = 'Elegí…', className = '' }) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  // Si abajo no entra la lista, se abre hacia arriba.
  const [up, setUp] = useState(false)
  const containerRef = useRef(null)
  const buttonRef = useRef(null)
  const listRef = useRef(null)
  const listboxId = useId()

  const selectedIndex = options.findIndex((o) => o.value === value)
  const selected = options[selectedIndex]

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // La opcion activa siempre a la vista dentro de la lista.
  useEffect(() => {
    if (!open || activeIndex < 0) return
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex])

  function openList() {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) {
      const below = window.innerHeight - rect.bottom
      setUp(below < LIST_MAX_HEIGHT + 16 && rect.top > below)
    }
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
  }

  function choose(index) {
    const option = options[index]
    if (option) onChange(option.value)
    setOpen(false)
    buttonRef.current?.focus()
  }

  function handleKeyDown(event) {
    const { key } = event
    if (!open) {
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
        event.preventDefault()
        openList()
      }
      return
    }
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => moveActiveIndex(current, key === 'ArrowDown' ? 1 : -1, options.length))
    } else if (key === 'Home' || key === 'End') {
      event.preventDefault()
      setActiveIndex(key === 'Home' ? 0 : options.length - 1)
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault()
      choose(activeIndex)
    } else if (key === 'Escape' || key === 'Tab') {
      setOpen(false)
    } else if (key.length === 1 && /\S/.test(key)) {
      const letter = key.toLowerCase()
      const start = activeIndex + 1
      const order = [...options.keys()].map((i) => (i + start) % options.length)
      const next = order.find((i) => options[i].label.toLowerCase().startsWith(letter))
      if (next != null) setActiveIndex(next)
    }
  }

  return (
    <div className={`select ${className}`} ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        className={open ? 'select-button open' : 'select-button'}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={label}
        aria-labelledby={labelledBy}
        aria-activedescendant={open && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
      >
        {selected?.color && <span className="result-dot" style={{ background: selected.color }} aria-hidden="true" />}
        <span className={selected ? 'select-value' : 'select-value placeholder'}>{selected?.label ?? placeholder}</span>
        <svg className="select-chevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className={up ? 'search-results select-list up' : 'search-results select-list'} id={listboxId} role="listbox" ref={listRef}>
          {options.map((option, index) => (
            <div
              key={String(option.value)}
              id={`${listboxId}-${index}`}
              role="option"
              aria-selected={index === selectedIndex}
              className={[
                'search-result-row',
                index === activeIndex ? 'active' : '',
                index === selectedIndex ? 'selected' : '',
              ].join(' ')}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
            >
              {option.color && <span className="result-dot" style={{ background: option.color }}></span>}
              <span className="result-name">{option.label}</span>
              {option.meta && <span className="result-meta">{option.meta}</span>}
              {index === selectedIndex && (
                <svg className="select-check" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="m5 12 5 5 9-10" />
                </svg>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
