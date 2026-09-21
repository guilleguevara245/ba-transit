import { useEffect, useState } from 'react'
import './Header.css'

function formatTime(date) {
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

export default function Header() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <header className="header">
        <div className="wrap header-row">
          <div className="brand">
            <span className="brand-mark"></span>
            BA Transit
          </div>
          <div className="header-meta">
            <span>
              <span className="dot"></span>
              {formatTime(now)}
            </span>
          </div>
        </div>
      </header>
      <div className="hazard"></div>
    </>
  )
}
