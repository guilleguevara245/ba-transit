import { useEffect, useRef, useState } from 'react'
import { CircleMarker, Marker, Polyline } from 'react-leaflet'
import { cruiseTo, stopCruise } from '../utils/cruise.js'
import { drawPath, glideTo, hidePath, stopGlide } from '../utils/glide.js'
import { whenSettled } from '../utils/motion.js'

/**
 * Hook comun: react-leaflet mueve la capa de una cada vez que cambia la
 * posicion. Por eso se le pasa siempre la primera (no cambia) y cada nueva
 * se aplica aca, deslizandose si animate.
 */
function useGlide(ref, lat, lon, animate) {
  useEffect(() => {
    if (ref.current) glideTo(ref.current, [lat, lon], { animate })
  }, [ref, lat, lon, animate])
  useEffect(() => {
    const layer = ref.current
    return () => layer && stopGlide(layer)
  }, [ref])
}

/** Marker que se desliza a su nueva posicion (animate: si corresponde animar ahora). */
export function GlideMarker({ position, animate = true, ...props }) {
  const ref = useRef(null)
  const [first] = useState(position)
  useGlide(ref, position[0], position[1], animate)
  return <Marker ref={ref} position={first} {...props} />
}

/** CircleMarker que se desliza a su nueva posicion. */
export function GlideCircleMarker({ center, animate = true, ...props }) {
  const ref = useRef(null)
  const [first] = useState(center)
  useGlide(ref, center[0], center[1], animate)
  return <CircleMarker ref={ref} center={first} {...props} />
}

/**
 * Marker de un avion: entre actualizaciones sigue avanzando con su rumbo
 * y velocidad (speed en km/h; moving: si esta volando).
 */
export function CruiseMarker({ position, heading, speed, moving, ...props }) {
  const ref = useRef(null)
  const [first] = useState(position)
  const [lat, lon] = position
  // Solo cuando cambia el dato: si llega igual, sigue avanzando en vez de volver atras.
  useEffect(() => {
    if (ref.current) cruiseTo(ref.current, { position: [lat, lon], heading, speed, moving })
  }, [lat, lon, heading, speed, moving])
  useEffect(() => {
    const layer = ref.current
    return () => layer && stopCruise(layer)
  }, [])
  return <Marker ref={ref} position={first} {...props} />
}

/**
 * Polyline que se dibuja de punta a punta al aparecer (y otra vez si
 * cambia drawKey, por ejemplo al cambiar de sentido). Espera a que la
 * pagina termine de cargar: si no, la animacion pasa sin que se vea.
 */
export function DrawnPolyline({ drawKey, ...props }) {
  const ref = useRef(null)
  useEffect(() => {
    // Escondida desde el principio, asi no se ve entera y despues se borra para dibujarse.
    let stop = hidePath(ref.current)
    const cancel = whenSettled(() => {
      stop = drawPath(ref.current)
    })
    return () => {
      cancel()
      stop()
    }
  }, [drawKey])
  return <Polyline ref={ref} {...props} />
}
