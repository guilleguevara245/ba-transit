import { useState } from 'react'
import Chevrons from './Chevrons.jsx'
import {
  MONTHS,
  WEEKDAYS,
  currentMonth,
  dayKind,
  monthGrid,
  monthHolidays,
  parseKey,
  scheduleText,
  shiftMonth,
} from '../utils/calendar.js'
import { formatClock, formatClock12, formatDayDate, formatNumericDate } from '../utils/format.js'
import './ClockPanel.css'

const FORMATS = [
  ['24', '24 h'],
  ['12', '12 h'],
]
const DATES = [
  ['larga', 'Larga'],
  ['corta', 'Corta'],
  ['sin', 'Sin fecha'],
]
const LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/** Botones de una sola eleccion (como los del tema). */
function Segmented({ label, options, value, onChange }) {
  return (
    <div className="clock-seg" role="radiogroup" aria-label={label}>
      {options.map(([key, text]) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          className={value === key ? 'on' : ''}
          onClick={() => onChange(key)}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

/** "Lunes 23 de noviembre" a partir de la clave del dia. */
function dayTitle(key) {
  const { month, day, weekday } = parseKey(key)
  const name = WEEKDAYS[weekday]
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${day} de ${MONTHS[month]}`
}

/**
 * Calendario del mes: los feriados marcados y, al tocar un dia, que
 * horario rige. Empieza en el mes de hoy con hoy elegido.
 */
function MonthCalendar({ todayKey }) {
  const [shown, setShown] = useState(() => currentMonth())
  const [selected, setSelected] = useState(todayKey)
  const weeks = monthGrid(shown.year, shown.month)
  const holidays = monthHolidays(shown.year, shown.month)
  const picked = dayKind(selected)

  return (
    <div className="clock-cal">
      <div className="clock-cal-head">
        <button
          type="button"
          className="clock-cal-nav"
          aria-label="Mes anterior"
          onClick={() => setShown((m) => shiftMonth(m, -1))}
        >
          <Chevrons direction="left" />
        </button>
        <strong aria-live="polite">
          {MONTHS[shown.month].charAt(0).toUpperCase() + MONTHS[shown.month].slice(1)} {shown.year}
        </strong>
        <button
          type="button"
          className="clock-cal-nav"
          aria-label="Mes siguiente"
          onClick={() => setShown((m) => shiftMonth(m, 1))}
        >
          <Chevrons />
        </button>
      </div>
      <div className="clock-cal-grid" role="group" aria-label="Días del mes">
        {LETTERS.map((letter, i) => (
          <span key={`l-${i}`} className="clock-cal-letter" aria-hidden="true">
            {letter}
          </span>
        ))}
        {weeks.flat().map((cell, i) => {
          if (!cell) return <span key={`e-${i}`} />
          const { kind, name } = dayKind(cell.key)
          const classes = ['clock-cal-day', `k-${kind}`]
          if (cell.key === todayKey) classes.push('today')
          if (cell.key === selected) classes.push('selected')
          return (
            <button
              key={cell.key}
              type="button"
              className={classes.join(' ')}
              aria-label={`${dayTitle(cell.key)}${name ? `, ${name}` : ''}`}
              aria-pressed={cell.key === selected}
              onClick={() => setSelected(cell.key)}
            >
              {cell.day}
            </button>
          )
        })}
      </div>
      <div className={`clock-cal-pick k-${picked.kind}`} role="status">
        <strong>
          {selected === todayKey ? 'Hoy · ' : ''}
          {dayTitle(selected)}
        </strong>
        {picked.name && <span className="clock-cal-name">{picked.name}</span>}
        <span>{scheduleText(selected)}</span>
      </div>
      {holidays.length > 0 && (
        <ul className="clock-cal-list" aria-label="Feriados del mes">
          {holidays.map((h) => (
            <li key={h.key} className={`k-${h.kind}`}>
              <span className="clock-cal-dot" aria-hidden="true" />
              <span>
                <b>
                  {h.weekday.charAt(0).toUpperCase() + h.weekday.slice(1)} {h.day}
                </b>{' '}
                {h.name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Panel que abre la hora del header: como se muestra el reloj (24 o 12
 * horas; fecha larga, corta o sin fecha) y el calendario del mes con los
 * feriados y el horario de transporte de cada dia.
 */
export default function ClockPanel({ id, now, todayKey, clock, onChange }) {
  const sample12 = formatClock12(now)
  return (
    <div className="clock-panel" id={id} role="dialog" aria-label="Reloj y calendario">
      <div className="clock-panel-section">
        <div className="clock-panel-row">
          <span className="clock-panel-label">Hora</span>
          <Segmented
            label="Formato de la hora"
            options={FORMATS}
            value={clock.formato}
            onChange={(formato) => onChange({ ...clock, formato })}
          />
        </div>
        <small className="clock-panel-sample">
          {clock.formato === '12' ? `${sample12.time} ${sample12.suffix}` : formatClock(now)}
        </small>
        <div className="clock-panel-row">
          <span className="clock-panel-label">Fecha</span>
          <Segmented
            label="Fecha del reloj"
            options={DATES}
            value={clock.fecha}
            onChange={(fecha) => onChange({ ...clock, fecha })}
          />
        </div>
        <small className="clock-panel-sample">
          {clock.fecha === 'larga'
            ? formatDayDate(now)
            : clock.fecha === 'corta'
              ? formatNumericDate(now)
              : 'Solo la hora'}
        </small>
      </div>
      <MonthCalendar todayKey={todayKey} />
    </div>
  )
}
