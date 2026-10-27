import BackButton from '../components/BackButton.jsx'
import ModeIcon from '../components/ModeIcon.jsx'
import SpecialServices from '../components/SpecialServices.jsx'
import { useApi } from '../hooks/useApi.js'
import './ModePage.css'
import './AirportsPage.css'

/** Avisos de trenes: servicios especiales y cambios en el servicio vigentes hoy. */
export default function TrainNoticesPage() {
  const { data, loading } = useApi('/api/v1/servicios-especiales')

  return (
    <div className="wrap content">
      <BackButton to="/red/trenes">Volver a Trenes</BackButton>
      <h1 className="page-title page-title-icon">
        <ModeIcon mode="TREN" size="lg" />
        Avisos de trenes
      </h1>
      <p className="page-subtitle">Servicios especiales y cambios en el servicio vigentes hoy.</p>

      {!loading && data && data.length === 0 && (
        <div className="bus-unavailable">No hay servicios especiales ni cambios en el servicio por hoy.</div>
      )}
      <SpecialServices showTitle={false} />

      <p className="airports-source">
        Fuente: Trenes Argentinos, “Modificaciones en el servicio y novedades”. Se cargan a mano a partir de los
        avisos oficiales.
      </p>
    </div>
  )
}
