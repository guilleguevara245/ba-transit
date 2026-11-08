import { Link } from 'react-router-dom'
import BackButton from '../components/BackButton.jsx'
import ExternalTitle from '../components/ExternalTitle.jsx'
import PageIndex from '../components/PageIndex.jsx'
import './ModePage.css'
import './AboutPage.css'

// Fecha de la ultima revision: actualizarla con cada cambio de esta pagina.
const UPDATED = '8 de noviembre de 2026'
const CONTACT_URL = 'https://github.com/guilleguevara245/ba-transit/issues'
const CHECK_ICON = 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-4 9.5 2.7 2.7L16 9.8'

/** Lo principal, para leer de un vistazo. */
const PROMISES = [
  ['Sin cuenta', 'El sitio se usa sin registrarte ni dar datos personales.'],
  ['Sin publicidad', 'No hay anuncios y no se venden datos.'],
  ['Sin seguimiento', 'No hay herramientas de seguimiento ni de estadísticas de visitas.'],
  ['Tus datos son tuyos', 'Con cuenta, los descargás o los borrás cuando quieras.'],
]

/** Lo que se guarda en el navegador de cada visitante (localStorage). */
const BROWSER_DATA = [
  { what: 'Tu nombre', why: 'Para saludarte en el inicio, si lo escribiste.' },
  { what: 'Tema claro u oscuro', why: 'Para abrir el sitio como lo dejaste.' },
  { what: 'Líneas, estaciones, accesos y colectivos favoritos', why: 'Para mostrarlos en el inicio.' },
  {
    what: 'Mis lugares (Casa, Trabajo y otros)',
    why: 'Para armar el viaje con un toque en Cómo llegar. Son la dirección que vos elegiste, su zona (unos 5 km) y la estación más cercana.',
  },
  {
    what: 'Tu zona del clima, si la elegiste',
    why: 'Para "Tu día" y las alertas del clima. Es el nombre y una zona de unos 5 km, no tu ubicación exacta.',
  },
  { what: 'Tus preferencias de avisos', why: 'Qué avisar y el horario sin avisos.' },
  { what: 'Tu sesión, si ingresaste', why: 'Para que no tengas que ingresar cada vez. Se borra al cerrar sesión.' },
  {
    what: 'Lo que cerraste o elegiste en pantalla',
    why: 'Las alertas del clima que cerraste (por ese día), la invitación a crear una cuenta, cómo ver el reloj y la pestaña de Novedades.',
  },
]

/** Lo que se guarda en el servidor con una cuenta. */
const ACCOUNT_DATA = [
  {
    what: 'Tu mail, nombre y apellido',
    why: 'Para ingresar y saludarte. Si entrás con Google, son los de tu cuenta de Google.',
  },
  {
    what: 'Favoritos y Mis lugares',
    why: 'Tus líneas, estaciones, accesos y colectivos, y la dirección de Casa, Trabajo y los otros lugares, con su zona (unos 5 km) y la estación más cercana.',
  },
  {
    what: 'Tus preferencias',
    why: 'El tema, cómo ver el reloj, tus preferencias de avisos y tu zona del clima (unos 5 km).',
  },
  {
    what: 'Tu imagen',
    why: 'Un avatar, la dirección de tu foto de Google o una foto que subas, achicada a 256 píxeles.',
  },
  { what: 'Fechas', why: 'Cuándo creaste la cuenta y cuándo ingresaste por última vez.' },
  {
    what: 'Tus dispositivos',
    why: 'De cada uno con la sesión abierta, el navegador y el sistema (por ejemplo, “Chrome en Windows”) y cuándo se usó. No se guarda la IP ni la ubicación.',
  },
]

/** Lo que se guarda en el servidor al activar los avisos. */
const PUSH_DATA = [
  {
    what: 'La dirección para mandarte avisos',
    why: 'La crea el servicio de notificaciones de tu navegador (Google, Mozilla, Apple o Microsoft), con unas claves para cifrarlos.',
  },
  {
    what: 'Tus favoritos y preferencias',
    why: 'Qué avisar, el horario sin avisos, la pausa, cuánto antes del último subte, la hora del aviso del clima para tu viaje y del resumen diario, y el nombre del saludo si lo escribiste.',
  },
  {
    what: 'Tus zonas',
    why: 'Las de Casa, Trabajo y tu zona del clima (de unos 5 km), para mandarte solo las alertas del clima que te alcanzan.',
  },
  { what: 'Los avisos que ya te llegaron', why: 'Para no repetirlos. Se borran a los 30 días.' },
]

/** Servicios externos que el navegador contacta directamente. */
const THIRD_PARTIES = [
  { who: 'OpenStreetMap', why: 'Las imágenes de los mapas.', url: 'https://osmfoundation.org/wiki/Privacy_Policy' },
  { who: 'Google Fonts', why: 'Las tipografías del sitio.', url: 'https://policies.google.com/privacy' },
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

/** Servicios que consulta el servidor: el navegador no se conecta con ellos. */
const SERVER_SERVICES = [
  {
    who: 'Open-Meteo',
    why: 'El pronóstico del clima, pedido con una zona de unos 5 km. No reciben tu IP ni tu ubicación.',
  },
  {
    who: 'Georef (direcciones del Estado nacional)',
    why: 'Confirma una dirección de Mis lugares y busca las de Cómo llegar, con el texto que escribiste. Las de Cómo llegar no se guardan con tus datos: el viaje se arma en tu navegador y la dirección no va en el enlace para compartir.',
  },
  {
    who: 'Brevo (envío de correos)',
    why: 'Manda el mail para recuperar la contraseña. Recibe solo tu dirección y el mensaje.',
  },
]

const INDEX = [
  ['resumen', 'En pocas palabras'],
  ['navegador', 'En tu navegador'],
  ['cuenta', 'Si creás una cuenta'],
  ['avisos', 'Si activás los avisos'],
  ['ubicacion', 'Tu ubicación'],
  ['servidor', 'El servidor'],
  ['externos', 'Servicios externos'],
  ['derechos', 'Tus derechos y contacto'],
]

/** Un dato y para que se usa, como renglon de una lista. */
function DataList({ items }) {
  return (
    <ul className="about-sources about-data">
      {items.map((d) => (
        <li key={d.what ?? d.who}>
          <span className="about-what">{d.what ?? d.who}</span>
          {d.url && (
            <a href={d.url} target="_blank" rel="noreferrer">
              <ExternalTitle text="Su política" />
            </a>
          )}
          <span className="about-detail">{d.why}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Politica de privacidad: que datos usa BA Transit, para que y donde
 * quedan. En computadora, con el indice fijo a la izquierda.
 */
export default function PrivacyPage() {
  return (
    <div className="wrap content about">
      <BackButton />
      <h1 className="page-title">Política de privacidad</h1>
      <p className="page-subtitle">Qué datos usa BA Transit, para qué y dónde quedan. Última revisión: {UPDATED}.</p>

      <div className="about-layout">
        <PageIndex items={INDEX} />

        <div className="about-main">
          <section className="about-block" id="resumen">
            <h2 className="about-heading">En pocas palabras</h2>
            <ul className="privacy-promises">
              {PROMISES.map(([title, text]) => (
                <li key={title}>
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d={CHECK_ICON} />
                  </svg>
                  <span>
                    <strong>{title}</strong>
                    {text}
                  </span>
                </li>
              ))}
            </ul>
            <p>
              La cuenta es opcional y sirve solo para tener tus favoritos, lugares y preferencias en todos tus
              dispositivos.
            </p>
          </section>

          <section className="about-block" id="navegador">
            <h2 className="about-heading">Lo que queda en tu navegador</h2>
            <p>
              Estos datos se guardan en tu dispositivo (en el almacenamiento del navegador). Sin cuenta, no se envían al
              servidor. Los podés borrar cuando quieras borrando los datos del sitio desde la configuración del
              navegador.
            </p>
            <DataList items={BROWSER_DATA} />
          </section>

          <section className="about-block" id="cuenta">
            <h2 className="about-heading">Si creás una cuenta</h2>
            <p>
              Se guardan en el servidor para que puedas ingresar y ver lo tuyo en cualquier dispositivo: no se usan para
              nada más ni se comparten.
            </p>
            <DataList items={ACCOUNT_DATA} />
            <p>
              Si usás mail y contraseña, la contraseña se guarda cifrada (con PBKDF2 y una sal propia), nunca tal cual.
              Si entrás con Google, Google le confirma al sitio tu mail y tu nombre; BA Transit no recibe tu contraseña
              de Google ni accede a nada más de tu cuenta. Si pedís recuperar la contraseña, te llega un mail con un
              link de un solo uso que vence en una hora.
            </p>
            <p>
              Desde <Link to="/cuenta">Tu cuenta</Link> podés descargar todo en un archivo o borrar la cuenta: se borran
              todos sus datos del servidor en el momento. En <Link to="/dispositivos">Dispositivos</Link> podés cerrar
              la sesión de los que no reconozcas.
            </p>
          </section>

          <section className="about-block" id="avisos">
            <h2 className="about-heading">Si activás los avisos</h2>
            <p>
              Se guardan en el servidor para mandarte los avisos que elegiste. No hace falta cuenta; si ingresaste,
              quedan asociados a ella.
            </p>
            <DataList items={PUSH_DATA} />
            <p>
              Los avisos viajan cifrados: el servicio del navegador los entrega pero no puede leerlos. Podés apagarlos
              cuando quieras desde <Link to="/notificaciones">Avisos</Link> o desde la configuración del navegador, y
              ahí se borra la suscripción.
            </p>
          </section>

          <section className="about-block" id="ubicacion">
            <h2 className="about-heading">Tu ubicación</h2>
            <p>
              Solo se pide si tocás un botón que la usa, y el navegador te pregunta antes. En Estacionamiento, para
              buscar lo más cercano: la cuenta se hace en tu dispositivo y la ubicación no se envía ni se guarda. En Tu
              día, para elegir tu zona del clima: se guarda solo el nombre de la estación más cercana y una zona de unos
              5 km, nunca el punto exacto.
            </p>
          </section>

          <section className="about-block" id="servidor">
            <h2 className="about-heading">El servidor</h2>
            <p>
              El servidor de BA Transit consulta las fuentes de datos (ver{' '}
              <Link to="/acerca">Acerca de y fuentes de datos</Link>) y le responde al sitio. Fuera de las cuentas y los
              avisos, no guarda información de quienes lo visitan. Los datos están en una base de datos PostgreSQL
              alojada en Neon. Como cualquier sitio web, el proveedor donde está alojado (Render) puede registrar por un
              tiempo la dirección IP y la hora de cada pedido, para su funcionamiento y seguridad.
            </p>
            <p>
              Dos cosas quedan un rato en la memoria del servidor (no en la base de datos) y se borran solas: las
              búsquedas de direcciones, un día y sin nada que diga quién las hizo, para no consultar dos veces la misma;
              y cuántas búsquedas de direcciones e intentos de ingreso llegan desde cada dirección IP, hasta 15 minutos,
              para frenar abusos.
            </p>
            <p>
              El estado de cada fuente se puede ver en <Link to="/estado">Estado de los datos</Link>.
            </p>
          </section>

          <section className="about-block" id="externos">
            <h2 className="about-heading">Servicios externos</h2>
            <h3 className="about-subheading">Tu navegador se conecta con</h3>
            <p>
              Para mostrar algunas partes del sitio, tu navegador se conecta directamente con estos servicios, que
              reciben tu dirección IP como en cualquier conexión. Cada uno tiene su propia política.
            </p>
            <DataList items={THIRD_PARTIES} />
            <h3 className="about-subheading">El servidor consulta por vos</h3>
            <p>Tu navegador no se conecta con estos servicios: los consulta el servidor de BA Transit.</p>
            <DataList items={SERVER_SERVICES} />
          </section>

          <section className="about-block" id="derechos">
            <h2 className="about-heading">Tus derechos y contacto</h2>
            <p>
              En la Argentina, la Ley 25.326 de Protección de Datos Personales te da derecho a saber qué datos tuyos se
              tienen, a corregirlos y a pedir que se borren. La autoridad de aplicación es la Agencia de Acceso a la
              Información Pública.
            </p>
            <p>
              Para consultas sobre esta política, escribí en{' '}
              <a href={CONTACT_URL} target="_blank" rel="noreferrer">
                <ExternalTitle text="el repositorio del proyecto" />
              </a>
              . Si la política cambia, se actualiza esta página y su fecha de revisión. Las reglas de uso del sitio
              están en las <Link to="/condiciones">Condiciones del servicio</Link>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
