import Chevrons from './Chevrons.jsx'
import './Chevrons.css'

/**
 * Separador de un recorrido de ida y vuelta ("Retiro ‹‹‹››› Dr. Cabred"):
 * los chevrones del sitio espalda con espalda, del color de la linea (en
 * lugar de la flecha doble). Para lectores de pantalla dice "a".
 */
export default function BothWays({ color }) {
  return (
    <span className="both-ways" style={color ? { color } : undefined}>
      <Chevrons direction="left" />
      <Chevrons />
      <span className="visually-hidden"> a </span>
    </span>
  )
}
