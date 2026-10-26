<p align="center">
  <img src="design/ba-transit-logo.jpg" alt="BA Transit" width="800">
</p>

<p align="center">
  <a href="https://ba-transit.onrender.com"><strong>Ver el sitio en vivo →</strong></a>
</p>

<p align="center">
  <img src="https://github.com/guilleguevara245/ba-transit/actions/workflows/ci.yml/badge.svg" alt="CI">
  <img src="https://img.shields.io/badge/Java-21-blue" alt="Java 21">
  <img src="https://img.shields.io/badge/Spring%20Boot-3.5-6DB33F" alt="Spring Boot 3.5">
  <img src="https://img.shields.io/badge/React-18-61DAFB" alt="React 18">
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791" alt="PostgreSQL 16">
  <img src="https://img.shields.io/badge/license-MIT-lightgrey" alt="Licencia MIT">
</p>

# BA Transit

**El estado del transporte de Buenos Aires en un solo lugar.** Subte, Premetro, trenes, colectivos, accesos a la
Ciudad, EcoBici y aeropuertos: alertas en vivo, próximos trenes, recorridos, tarifas, cortes de tránsito y un
planificador de viajes.

La información del transporte del AMBA está repartida entre muchas fuentes oficiales, cada una con su formato. BA
Transit las reúne, las cruza y las muestra de forma simple, pensada para consultar rápido antes de salir.

Es mi primer proyecto personal de portfolio, hecho de punta a punta: backend, frontend, base de datos, integración
con APIs públicas, pruebas, integración continua y despliegue.

<p align="center">
  <img src="docs/capturas/inicio.png" alt="Inicio de BA Transit" width="820">
</p>

<p align="center">
  <img src="docs/capturas/como-llegar.png" alt="Planificador Cómo llegar" width="49%">
  <img src="docs/capturas/inicio-oscuro.png" alt="Inicio en modo oscuro" width="49%">
</p>

<p align="center">
  <img src="docs/capturas/celular.png" alt="BA Transit en el celular" width="260">
</p>

> Las capturas usan datos de muestra.

## Funcionalidades

**Estado de la red**
- Estado de cada modo (trenes, subtes, Premetro, accesos) y alertas de servicio sincronizadas cada 5 minutos desde la
  API Transporte de la Ciudad.
- Alertas meteorológicas del Servicio Meteorológico Nacional (tormentas, lluvias, calor) que afectan al AMBA, con un
  consejo para quien va a viajar.
- Eventos masivos, manifestaciones y obras que cortan calles, con aviso en las estaciones y los accesos cercanos.

**Subte, Premetro y trenes**
- Mapa interactivo de toda la red con recorridos reales, combinaciones y filtro de estaciones accesibles.
- Página de cada línea y de cada estación: próximos trenes en vivo, último tren de la noche, historia, lugares
  cercanos, colectivos que paran cerca y accesibilidad.
- **Cómo llegar**: planificador propio (algoritmo de Dijkstra sobre el grafo de la red) con combinaciones, tiempo
  estimado, opción de viajar solo por estaciones accesibles y enlace para compartir el viaje.

**Colectivos, accesos y más**
- Colectivos en movimiento en tiempo real sobre el mapa, búsqueda por número y recorrido con paradas y tiempos.
- Estado del tránsito en las autopistas de acceso (TomTom Traffic) y cuadro de peajes.
- Estaciones de EcoBici con bicis y anclajes disponibles.
- Aeropuertos con el clima actual y cómo llegar.
- Cuadro tarifario completo del AMBA y simulador del descuento Red SUBE.

**Experiencia**
- Modo claro y oscuro, diseño adaptado a celular y feriados marcados en la fecha.
- Instalable como app en el celular, con pantalla "Sin conexión".
- Cada página se descarga recién cuando se abre, para que la primera visita sea liviana.

## Arquitectura

```mermaid
flowchart LR
    U[Navegador / app instalada] -->|HTTPS| F[Frontend<br>React + Vite<br>Render Static Site]
    F -->|REST /api/v1| B[Backend<br>Java 21 + Spring Boot<br>Render Web Service]
    B --> DB[(PostgreSQL<br>Neon)]
    B --> T[API Transporte GCBA<br>alertas, subte, colectivos,<br>EcoBici, eventos]
    B --> SMN[SMN<br>alertas CAP]
    B --> TT[TomTom Traffic]
    F --> OM[Open-Meteo<br>clima]
    F --> OSM[OpenStreetMap<br>mapas]
```

- **Backend**: API REST con Spring Boot. Sincroniza las fuentes externas con tareas programadas y guarda en caché las
  respuestas en vivo, para que muchas visitas juntas no se conviertan en muchas llamadas a las APIs. Las credenciales
  nunca se escriben en los logs.
- **Base de datos**: PostgreSQL con el esquema versionado en 40 migraciones de Flyway: líneas, ramales, estaciones con
  coordenadas reales, alertas, tarifas, servicios especiales y eventos.
- **Frontend**: React con React Router y Leaflet. La lógica (planificador, tarifas, horarios, textos) vive en funciones
  puras con sus propias pruebas, separada de los componentes.

## Decisiones técnicas destacadas

- **Datos en vivo con tolerancia a fallas**: si una API externa no responde, se muestran los últimos datos válidos y
  se avisa, en lugar de romper la página.
- **Planificador propio**: grafo construido a partir de las estaciones (tramos, cambios de ramal y combinaciones a pie)
  y camino más rápido con Dijkstra. Las estaciones con el mismo nombre y cercanas (Retiro, Once) se agrupan para salir
  por la línea que más conviene.
- **Lectura de alertas CAP**: el SMN publica sus alertas en el estándar de la Organización Meteorológica Mundial. El
  backend las lee, descarta las canceladas o reemplazadas y se queda con las que cubren el AMBA, comprobando si el
  polígono de la alerta contiene puntos de la Ciudad y el conurbano.
- **Seguridad**: los endpoints de escritura piden una clave de administrador (`X-API-Key`), los errores siguen el
  formato estándar Problem Details (RFC 9457) y el XML externo se procesa sin entidades externas.
- **Calidad**: pruebas unitarias, de controllers y de repositorios en el backend, y de la lógica del frontend, todas
  en GitHub Actions en cada push.

## Tecnologías

| Capa | Herramientas |
|---|---|
| Backend | Java 21, Spring Boot 3.5, Spring Data JPA, Flyway, springdoc-openapi (Swagger UI) |
| Base de datos | PostgreSQL 16 (Neon en producción, Docker en desarrollo) |
| Frontend | React 18, Vite, React Router, Leaflet / React Leaflet |
| Pruebas | JUnit 5, Mockito, MockMvc, Vitest, ESLint |
| Infraestructura | Docker Compose, GitHub Actions, Render, UptimeRobot |

## Fuentes de datos

| Dato | Fuente |
|---|---|
| Alertas de subte, próximos trenes, colectivos, EcoBici, eventos y cortes | [API Transporte del Gobierno de la Ciudad](https://www.buenosaires.gob.ar/desarrollourbano/transporte/apitransporte) |
| Alertas meteorológicas | [Servicio Meteorológico Nacional](https://www.smn.gob.ar/alertas) |
| Tránsito en los accesos | [TomTom Traffic](https://www.tomtom.com/products/traffic-apis/) |
| Clima en los aeropuertos | [Open-Meteo](https://open-meteo.com/) |
| Tarifas | [Red SUBE](https://www.argentina.gob.ar/redsube/tarifas-de-transporte-publico-amba) |
| Horarios y accesibilidad del subte | [Emova](https://emova.com.ar/) |
| Mapas | [OpenStreetMap](https://www.openstreetmap.org/copyright) |

## Estructura del proyecto

```
ba-transit/
├── backend/                  API REST (Java 21 + Spring Boot)
│   └── src/main/
│       ├── java/com/batransit/api/
│       │   ├── controller/   endpoints de líneas, estaciones, alertas, tarifas
│       │   ├── service/      lógica de negocio
│       │   ├── domain/       entidades JPA
│       │   ├── live/         datos en tiempo real (subte, colectivos, EcoBici)
│       │   ├── colectivos/   feed GTFS de colectivos
│       │   ├── accesos/      tránsito en autopistas (TomTom)
│       │   ├── clima/        alertas del SMN (CAP)
│       │   ├── eventos/      eventos masivos y cortes
│       │   └── security/     clave para los endpoints de escritura
│       └── resources/db/migration/   migraciones Flyway
├── frontend/                 cliente web (React + Vite)
│   ├── public/               íconos, manifest y service worker
│   └── src/
│       ├── pages/            una página por sección
│       ├── components/       componentes reutilizables
│       ├── hooks/            consumo de la API, favoritos, reloj
│       ├── utils/            lógica pura con pruebas
│       └── data/             datos fijos (historia de estaciones, peajes, aeropuertos)
├── docs/capturas/            imágenes de este README
└── .github/workflows/        integración continua
```

## Cómo correrlo

Requisitos: Docker, Java 21, Maven y Node 22.

```bash
git clone https://github.com/guilleguevara245/ba-transit.git
cd ba-transit
```

**Backend**

```bash
cd backend
cp .env.example .env      # completar las variables (ver abajo)
docker compose --env-file .env up --build
```

La API queda en `http://localhost:8080` y la documentación interactiva en `http://localhost:8080/swagger-ui.html`.

| Variable | Para qué | Si falta |
|---|---|---|
| `TRANSPORTE_CLIENT_ID` / `TRANSPORTE_CLIENT_SECRET` | API Transporte ([registro gratuito](https://www.buenosaires.gob.ar/form/formulario-de-registro-api-transporte)) | sin alertas, subte en vivo, colectivos ni eventos |
| `TOMTOM_API_KEY` | estado del tránsito en los accesos | Accesos sin estado en vivo |
| `ADMIN_API_KEY` | endpoints de escritura (`POST`) | escritura deshabilitada |

Más detalle en [`backend/README.md`](./backend/README.md).

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

El sitio queda en `http://localhost:5173`. En desarrollo, Vite reenvía `/api` al backend local; en producción se
define `VITE_API_BASE_URL` (ver `frontend/.env.example`).

## Pruebas

```bash
# Backend (necesita PostgreSQL: docker compose up -d postgres)
cd backend && mvn clean verify

# Frontend
cd frontend && npm run lint && npm test
```

## Autor

**Guillermo Guevara** · [GitHub](https://github.com/guilleguevara245)

## Licencia

MIT. Ver [`LICENSE`](./LICENSE).
