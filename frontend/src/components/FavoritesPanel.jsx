import MyBuses from './MyBuses.jsx'
import MyLines from './MyLines.jsx'
import NotificationsLink from './NotificationsLink.jsx'
import { MyAccesses, MyStations } from './MyPlaces.jsx'
import { useFavoriteList } from '../hooks/useFavoriteList.js'
import './FavoritesPanel.css'

/**
 * "Tus favoritos" en el inicio: un solo panel con un renglon por favorito
 * (lineas, estaciones, accesos y colectivos), el estado siempre en la misma
 * columna y, debajo de cada uno, sus proximos trenes si los tiene. Arriba a
 * la derecha, el acceso a los avisos.
 */
export default function FavoritesPanel({ lines, alerts }) {
  const total =
    useFavoriteList('lineas').ids.length +
    useFavoriteList('estaciones').ids.length +
    useFavoriteList('accesos').ids.length +
    useFavoriteList('colectivos').ids.length
  const ready = Boolean(lines && alerts)

  return (
    <section className="fav-panel" aria-labelledby="fav-title">
      <header className="fav-head">
        <h2 id="fav-title">Tus favoritos</h2>
        {ready && <NotificationsLink compact />}
      </header>
      {total === 0 ? (
        <p className="fav-empty">
          Tocá la <span className="star">★</span> en cualquier línea, estación, acceso o colectivo para seguir su estado
          desde acá. Se guardan en este navegador.
        </p>
      ) : (
        <div className="fav-list">
          {ready && <MyLines lines={lines} alerts={alerts} inPanel />}
          {ready && <MyStations lines={lines} alerts={alerts} inPanel />}
          <MyAccesses inPanel />
          <MyBuses inPanel />
        </div>
      )}
    </section>
  )
}
