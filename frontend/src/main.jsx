import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import 'leaflet/dist/leaflet.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Service worker (instalable y aviso sin conexion). Solo en produccion:
// en desarrollo guardaria archivos viejos en cache.
if (import.meta.env.PROD && 'serviceWorker' in window.navigator) {
  window.addEventListener('load', () => {
    window.navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
