import { Link } from 'react-router-dom'
import Chevrons from './Chevrons.jsx'
import { useApi } from '../hooks/useApi.js'
import './SpecialServices.css'

/** Aviso chico con la cantidad de servicios especiales y cambios vigentes, que lleva a la pagina de avisos. */
export default function TrainNoticesLink() {
  const { data } = useApi('/api/v1/servicios-especiales')
  if (!data || data.length === 0) return null

  return (
    <Link className="notices-link chevrons-host" to="/trenes/avisos">
      <span className="special-tag special-tag-cambio">Avisos</span>
      <span className="notices-text">
        {data.length === 1 ? 'Hay 1 servicio especial o cambio' : `Hay ${data.length} servicios especiales o cambios`}{' '}
        en trenes hoy
      </span>
      <Chevrons />
    </Link>
  )
}
