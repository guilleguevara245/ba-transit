import { Link } from 'react-router-dom'
import BackButton from '../components/BackButton.jsx'
import './ModePage.css'
import './AboutPage.css'

// Fecha de la ultima revision: actualizarla con cada cambio de esta pagina.
const UPDATED = '29 de octubre de 2026'
const CONTACT_URL = 'https://github.com/guilleguevara245/ba-transit/issues'

/** Lo que se guarda en el navegador de cada visitante (localStorage). */
const BROWSER_DATA = [
  { what: 'Tu nombre', why: 'Para saludarte en el inicio, si lo escribiste.' },
  { what: 'Tema claro u oscuro', why: 'Para abrir el sitio como lo dejaste.' },
  { what: 'Líneas, estaciones y accesos favoritos', why: 'Para mostrarlos en el inicio.' },
  {
    what: 'Mis lugares (Casa, Trabajo y otros)',
    why: 'Para armar el viaje con un toque en Cómo llegar. Son la estación o la dirección que vos elegiste.',
  },
  { what: 'Alertas del clima que cerraste', why: 'Para no volver a mostrártelas.' },
  { what: 'Tu sesión, si ingresaste', why: 'Para que no tengas que ingresar cada vez. Se borra al cerrar sesión.' },
  { what: 'Tus preferencias de avisos', why: 'Qué avisar y el horario sin avisos.' },
]

/** Servicios externos que el navegador contacta directamente. */
const THIRD_PARTIES = [
  { who: 'OpenStreetMap', why: 'Las imágenes de los mapas.', url: 'https://osmfoundation.org/wiki/Privacy_Policy' },
  { who: 'Google Fonts', why: 'Las tipografías del sitio.', url: 'https://policies.google.com/privacy' },
  { who: 'Open-Meteo', why: 'El clima de los aeropuertos.', url: 'https://open-meteo.com/en/terms' },
  {
    who: 'Google (ingreso)',
    why: 'Solo si tocás "Continuar con Google" para ingresar.',
    url: 'https://policies.google.com/privacy',
  },
  {
    who: 'Google Maps',
    why: 'Solo si tocás "Abrir en Google Maps" en Cómo llegar.',
    url: 'https://policies.google.com/privacy',
  },
]

/** Politica de privacidad: que datos usa BA Transit, para que y donde quedan. */
export default function PrivacyPage() {
  return (
    <div className="wrap content about">
      <BackButton />
      <h1 className="page-title">Política de privacidad</h1>
      <p className="page-subtitle">Qué datos usa BA Transit, para qué y dónde quedan. Última revisión: {UPDATED}.</p>

      <section className="about-block">
        <h2 className="about-heading">En pocas palabras</h2>
        <p>
          BA Transit se puede usar sin cuenta y sin dar ningún dato personal. La cuenta es opcional y sirve solo para
          tener los favoritos en todos tus dispositivos. No hay publicidad, no se venden datos y no se usan
          herramientas de seguimiento ni de estadísticas de visitas.
        </p>
      </section>

      <section className="about-block">
        <h2 className="about-heading">Lo que queda en tu navegador</h2>
        <p>
          Estos datos se guardan en tu dispositivo (en el almacenamiento del navegador). Sin cuenta, no se envían al
          servidor. Los podés borrar cuando quieras borrando los datos del sitio desde la configuración del navegador.
        </p>
        <ul className="about-sources">
          {BROWSER_DATA.map((d) => (
            <li key={d.what}>
              <span className="about-what">{d.what}</span>
              <span className="about-detail">{d.why}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="about-block">
        <h2 className="about-heading">Si creás una cuenta</h2>
        <p>
          Se guardan en el servidor tu mail, el nombre que elijas (o el de tu cuenta de Google), tus líneas, estaciones y
          accesos favoritos, tus lugares guardados (la estación o dirección de Casa, Trabajo y los otros que agregues), la imagen que elijas (un avatar, la dirección de tu foto de Google o una foto que subas,
          achicada a 256 píxeles) y las fechas en que creaste la cuenta e ingresaste por última vez. Se usan solo para que
          puedas ingresar y ver tus favoritos en cualquier dispositivo: no se usan para nada más ni se comparten.
        </p>
        <p>
          Si usás mail y contraseña, la contraseña se guarda cifrada (con PBKDF2 y una sal propia), nunca tal cual. Si
          entrás con Google, Google le confirma al sitio tu mail y tu nombre; BA Transit no recibe tu contraseña de
          Google ni accede a nada más de tu cuenta.
        </p>
        <p>
          Si pedís recuperar la contraseña, se te manda un mail con un link de un solo uso que vence en una hora. El
          mail se envía a través de Brevo, un servicio de envío de correos, que recibe solo tu dirección y el mensaje.
        </p>
        <p>
          Podés borrar tu cuenta cuando quieras desde <Link to="/cuenta">Tu cuenta</Link>: se borran todos sus datos
          del servidor en el momento.
        </p>
      </section>

      <section className="about-block">
        <h2 className="about-heading">Si activás los avisos</h2>
        <p>
          Tu navegador le da al sitio una dirección para mandarte avisos (la crea el servicio de notificaciones del
          navegador: Google, Mozilla, Apple o Microsoft) y unas claves para cifrarlos. Se guardan en el servidor junto
          con tus favoritos y tus preferencias (qué avisar, el horario sin avisos, la pausa, cuánto antes del último subte y el resumen
          diario, con el nombre del saludo si lo escribiste), y un registro de qué avisos ya te llegaron, que se borra a los 30 días. No hace falta cuenta; si ingresaste, quedan asociados a ella.
        </p>
        <p>
          Los avisos viajan cifrados: el servicio del navegador los entrega pero no puede leerlos. Podés apagarlos
          cuando quieras desde <Link to="/notificaciones">Avisos</Link> o desde la configuración del navegador, y ahí se
          borra la suscripción.
        </p>
      </section>

      <section className="about-block">
        <h2 className="about-heading">Tu ubicación</h2>
        <p>
          Solo se pide si tocás un botón para buscar lo más cercano (por ejemplo, en Estacionamiento). El navegador te
          pregunta antes, la cuenta se hace en tu dispositivo y la ubicación no se envía ni se guarda.
        </p>
      </section>

      <section className="about-block">
        <h2 className="about-heading">El servidor</h2>
        <p>
          El servidor de BA Transit consulta las fuentes de datos (ver <Link to="/acerca">Acerca de y fuentes de
          datos</Link>) y le responde al sitio. Fuera de las cuentas, no guarda información de quienes lo visitan. Las
          cuentas están en una base de datos PostgreSQL alojada en Neon. Como cualquier sitio web,
          el proveedor donde está alojado (Render) puede registrar por un tiempo la dirección IP y la hora de cada
          pedido, para su funcionamiento y seguridad.
        </p>
        <p>
          El estado de cada fuente se puede ver en <Link to="/estado">Estado de los datos</Link>.
        </p>
      </section>

      <section className="about-block">
        <h2 className="about-heading">Servicios externos</h2>
        <p>
          Para mostrar algunas partes del sitio, tu navegador se conecta directamente con estos servicios, que reciben
          tu dirección IP como en cualquier conexión. Cada uno tiene su propia política.
        </p>
        <ul className="about-sources">
          {THIRD_PARTIES.map((t) => (
            <li key={t.who}>
              <span className="about-what">{t.who}</span>
              <a href={t.url} target="_blank" rel="noreferrer">
                Su política ↗
              </a>
              <span className="about-detail">{t.why}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="about-block">
        <h2 className="about-heading">Tus derechos y contacto</h2>
        <p>
          En la Argentina, la Ley 25.326 de Protección de Datos Personales te da derecho a saber qué datos tuyos se
          tienen, a corregirlos y a pedir que se borren. La autoridad de aplicación es la Agencia de Acceso a la
          Información Pública.
        </p>
        <p>
          Para consultas sobre esta política, escribí en{' '}
          <a href={CONTACT_URL} target="_blank" rel="noreferrer">
            el repositorio del proyecto ↗
          </a>
          . Si la política cambia, se actualiza esta página y su fecha de revisión. Las reglas de uso del sitio están en
          las <Link to="/condiciones">Condiciones del servicio</Link>.
        </p>
      </section>
    </div>
  )
}
