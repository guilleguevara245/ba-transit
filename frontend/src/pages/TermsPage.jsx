import { Link } from 'react-router-dom'
import BackButton from '../components/BackButton.jsx'
import ExternalTitle from '../components/ExternalTitle.jsx'
import PageIndex from '../components/PageIndex.jsx'
import './ModePage.css'
import './AboutPage.css'

// Fecha de la ultima revision: actualizarla con cada cambio de esta pagina.
const UPDATED = '8 de noviembre de 2026'
const CONTACT_URL = 'https://github.com/guilleguevara245/ba-transit/issues'

/** Lo principal, para leer de un vistazo (el detalle esta en cada seccion). */
const POINTS = [
  {
    title: 'Gratis',
    text: 'Un proyecto personal, sin fines comerciales.',
    icon: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  },
  {
    title: 'Orientativo',
    text: 'Confirmá lo importante en los canales oficiales.',
    icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 8v5m0-8h.01',
  },
  {
    title: 'Sin garantías',
    text: 'Puede fallar, cambiar o dejar de estar.',
    icon: 'M12 9v4M12 17h.01M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6A2 2 0 0 0 22 18L13.7 3.9a2 2 0 0 0-3.4 0z',
  },
  {
    title: 'Uso normal',
    text: 'Consultalo y compartilo; no lo sobrecargues.',
    icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-4 9.5 2.7 2.7L16 9.8',
  },
]

const INDEX = [
  ['resumen', 'En pocas palabras'],
  ['que-es', 'Qué es BA Transit'],
  ['orientativa', 'La información es orientativa'],
  ['garantias', 'Sin garantías'],
  ['cuentas', 'Las cuentas'],
  ['uso', 'Uso aceptable'],
  ['terceros', 'Marcas y datos de terceros'],
  ['privacidad', 'Privacidad'],
  ['cambios', 'Cambios, ley aplicable y contacto'],
]

/**
 * Condiciones del servicio: reglas de uso de BA Transit y de las cuentas.
 * En computadora, con el indice fijo a la izquierda.
 */
export default function TermsPage() {
  return (
    <div className="wrap content about">
      <BackButton />
      <h1 className="page-title">Condiciones del servicio</h1>
      <p className="page-subtitle">Las reglas para usar BA Transit. Última revisión: {UPDATED}.</p>

      <div className="about-layout">
        <PageIndex items={INDEX} />

        <div className="about-main">
          <section className="about-block" id="resumen">
            <h2 className="about-heading">En pocas palabras</h2>
            <ul className="about-points neutral">
              {POINTS.map((point) => (
                <li key={point.title}>
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d={point.icon} />
                  </svg>
                  <span>
                    <strong>{point.title}</strong>
                    {point.text}
                  </span>
                </li>
              ))}
            </ul>
            <p>Es un resumen: lo que vale es el texto completo de cada sección, abajo.</p>
          </section>

          <section className="about-block" id="que-es">
            <h2 className="about-heading">Qué es BA Transit</h2>
            <p>
              BA Transit es un proyecto personal y gratuito de Guillermo Guevara que reúne información pública sobre el
              transporte de Buenos Aires: subte, Premetro, trenes, colectivos, accesos, EcoBici, estacionamiento y
              aeropuertos. No tiene fines comerciales ni relación con los organismos o empresas que operan esos
              servicios.
            </p>
            <p>Al usar el sitio aceptás estas condiciones. Si no estás de acuerdo, no lo uses.</p>
          </section>

          <section className="about-block" id="orientativa">
            <h2 className="about-heading">La información es orientativa</h2>
            <p>
              Los datos vienen de fuentes públicas y de terceros (ver{' '}
              <Link to="/acerca">Acerca de y fuentes de datos</Link>) y pueden tener demoras, errores o no estar
              disponibles. Horarios, tiempos de viaje, tarifas, peajes y estados de servicio son estimados. Antes de
              decidir algo importante, como llegar a un vuelo o a un turno, confirmalo en los canales oficiales de cada
              operador.
            </p>
            <p>
              El estado de cada fuente se puede ver en <Link to="/estado">Estado de los datos</Link>.
            </p>
          </section>

          <section className="about-block" id="garantias">
            <h2 className="about-heading">Sin garantías</h2>
            <p>
              El sitio se ofrece tal como está, sin garantía de que funcione siempre, sin interrupciones o sin errores.
              Se puede modificar, suspender o dar de baja, en todo o en parte, en cualquier momento. En la medida en que
              lo permita la ley, BA Transit y su autor no se hacen responsables por daños o perjuicios que resulten del
              uso del sitio o de la información que muestra.
            </p>
          </section>

          <section className="about-block" id="cuentas">
            <h2 className="about-heading">Las cuentas</h2>
            <p>
              La cuenta es opcional y sirve para tener tus favoritos, lugares y preferencias en todos tus dispositivos.
              Para crearla tenés que dar un mail que sea tuyo. Cuidá tu contraseña: sos responsable de lo que se haga
              con tu cuenta. Si ves un dispositivo que no reconocés, cerrá su sesión desde{' '}
              <Link to="/dispositivos">Dispositivos</Link>. Podés borrar la cuenta cuando quieras desde{' '}
              <Link to="/cuenta">Tu cuenta</Link>.
            </p>
            <p>
              Se pueden suspender o borrar las cuentas que se usen para abusar del servicio, por ejemplo con pedidos
              automáticos masivos o intentos de acceder a cuentas ajenas.
            </p>
          </section>

          <section className="about-block" id="uso">
            <h2 className="about-heading">Uso aceptable</h2>
            <p>
              No uses el sitio ni su API para sobrecargar el servidor, saltear sus límites, acceder a datos o cuentas de
              otras personas, ni para nada ilegal. Consultar el sitio de forma normal, compartir sus enlaces e
              instalarlo como app está bien.
            </p>
          </section>

          <section className="about-block" id="terceros">
            <h2 className="about-heading">Marcas y datos de terceros</h2>
            <p>
              Los nombres, colores y logos de líneas, operadores y servicios pertenecen a sus dueños y se usan solo para
              identificarlos. Los datos de cada fuente siguen sujetos a sus propias licencias y condiciones (ver{' '}
              <Link to="/acerca">Acerca de y fuentes de datos</Link>); las fotos de las estaciones son de Wikimedia
              Commons, con la licencia de cada una, y los mapas son de © colaboradores de OpenStreetMap.
            </p>
          </section>

          <section className="about-block" id="privacidad">
            <h2 className="about-heading">Privacidad</h2>
            <p>
              Qué datos se usan y para qué está en la <Link to="/privacidad">Política de privacidad</Link>, que forma
              parte de estas condiciones.
            </p>
          </section>

          <section className="about-block" id="cambios">
            <h2 className="about-heading">Cambios, ley aplicable y contacto</h2>
            <p>
              Estas condiciones pueden cambiar; la versión vigente es siempre la de esta página, con su fecha de
              revisión. Se rigen por las leyes de la República Argentina.
            </p>
            <p>
              Para consultas, escribí en{' '}
              <a href={CONTACT_URL} target="_blank" rel="noreferrer">
                <ExternalTitle text="el repositorio del proyecto" />
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
