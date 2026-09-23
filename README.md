<p align="center">
  <img src="design/ba-transit-logo.jpg" alt="BA Transit" width="800">
</p>

<p align="center">
  <img src="https://github.com/guilleguevara245/ba-transit/actions/workflows/ci.yml/badge.svg" alt="Estado del backend">
  <img src="https://img.shields.io/badge/Java-21-blue" alt="Java 21">
  <img src="https://img.shields.io/badge/React-Vite-61DAFB" alt="React + Vite">
  <img src="https://img.shields.io/badge/status-en%20desarrollo-yellow" alt="En desarrollo">
</p>

# BA Transit

Plataforma web de información sobre transporte público del Área Metropolitana de Buenos Aires (AMBA) y CABA, desarrollada en Java + Spring Boot con frontend en React.

## Descripción

BA Transit resuelve un problema que cualquiera que viaje en transporte público de Buenos Aires conoce de memoria: la información sobre el estado del servicio, las alertas y las tarifas está dispersa entre distintas fuentes oficiales, cada una con su propio formato, y no siempre es fácil de consultar rápido antes de salir de casa.

Este proyecto nace de esa fricción cotidiana. La idea es centralizar en un solo lugar el estado en vivo de subte, trenes, premetro y colectivos del AMBA: qué líneas están funcionando con normalidad, qué alertas hay activas, cuánto sale el viaje según el tramo, y poder buscar una línea o estación sin tener que recordar en qué app oficial mirar cada cosa.

El backend sincroniza automáticamente las alertas de subte desde la API Transporte oficial de la Ciudad de Buenos Aires, así el dato que ve el usuario está actualizado sin intervención manual. El resto del proyecto (colectivos, trenes, estadísticas) se está construyendo por fases, documentando en cada paso qué está terminado y qué no — prefiero mostrar el progreso real antes que simular que el proyecto ya está completo.

## Funcionalidades

- Consulta de líneas de transporte por modo (subte, tren, premetro) con sus ramales y estaciones
- Alertas de servicio por línea, con sincronización automática desde la API Transporte de Buenos Aires (cada 5 minutos, solo subte por ahora — ver limitaciones en [`backend/README.md`](./backend/README.md))
- Tarifas por modo y tramo de distancia
- Búsqueda combinada de líneas y estaciones por texto
- Dashboard en React con estado en vivo por modo, panel de alertas y panel de tarifas, conectado en tiempo real a la API
- Mapa interactivo (Leaflet + OpenStreetMap) de las 90 estaciones de subte, coloreadas por línea, con coordenadas reales
- Base de datos versionada con migraciones Flyway, sin pérdida de datos entre cambios de esquema

## Tecnologías

**Backend**
- **Java 21** + **Spring Boot 3.3**
- **PostgreSQL 16**
- **Flyway** para migraciones versionadas
- **Docker** + **Docker Compose**
- **GitHub Actions** para integración continua

**Frontend**
- **React** + **Vite**
- **React Router** para la navegación entre Dashboard y Mapa
- **Leaflet** + **React Leaflet** para el mapa interactivo
- Hooks propios para consumo de API, debounce de búsqueda y datos en vivo

## Estructura del proyecto

```
ba-transit/
├── backend/                 # API REST (Java 21 + Spring Boot + PostgreSQL)
│   ├── src/main/java/com/batransit/api/
│   │   ├── controller/      # Endpoints HTTP
│   │   ├── service/         # Lógica de negocio
│   │   ├── client/          # Integración con la API Transporte externa
│   │   └── scheduler/       # Job de sincronización automática de alertas
│   └── src/main/resources/db/migration/   # Migraciones Flyway
├── frontend/                # Cliente web (React + Vite)
│   └── src/
│       ├── pages/           # Dashboard y Mapa
│       ├── components/      # Header, navegación, búsqueda, paneles
│       └── hooks/           # useApi, useDebounce
├── design/                  # Mockups y referencias visuales
├── .github/workflows/       # CI del backend
└── README.md
```

## Instalación

```bash
git clone https://github.com/guilleguevara245/ba-transit.git
cd ba-transit
```

### Backend

```bash
cd backend
cp .env.example .env
# completar TRANSPORTE_CLIENT_ID y TRANSPORTE_CLIENT_SECRET en .env
# (se obtienen registrandose gratis en apitransporte.buenosaires.gob.ar/registro)
docker compose --env-file .env up --build
```

Instrucciones completas, variables de entorno y documentación de la API en [`backend/README.md`](./backend/README.md).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend espera al backend corriendo en `http://localhost:8080`.

## Uso

Con el backend y el frontend corriendo, el dashboard queda disponible en `http://localhost:5173` (puerto por defecto de Vite). Desde ahí se puede buscar una línea o estación, ver el estado en vivo por modo de transporte, consultar alertas y tarifas activas, y explorar el mapa de estaciones de subte en la pestaña "Mapa".

Para probar solo el backend:

```bash
curl http://localhost:8080/api/v1/status
curl http://localhost:8080/api/v1/lines
curl http://localhost:8080/api/v1/map/stations
```

## Tests

```bash
cd backend
docker compose up -d postgres
mvn clean verify
```

Un workflow de GitHub Actions corre la suite automáticamente en cada `push` y `pull request` a `main` sobre el backend. La cobertura de tests todavía es limitada y es una de las próximas cosas a reforzar.

## Estado del proyecto

**Fases 1 a 6 completas (Fase 4 solo para subte; el mapa también solo tiene datos de subte por ahora).**

- [x] Fase 1 — Base: Spring Boot, PostgreSQL, Docker Compose, CI
- [x] Fase 2 — Modelo de datos: líneas, ramales y estaciones reales de subte y tren, versionadas con Flyway *(pendiente: cargar estaciones y ramales reales de las líneas de tren, hoy solo tienen la línea en sí sin estaciones)*
- [x] Fase 3 — API: alertas, tarifas por tramo de distancia y búsqueda combinada de líneas y estaciones
- [x] Fase 4 — Actualización automática: job programado que sincroniza alertas de subte desde la API Transporte oficial (ver limitaciones en [`backend/README.md`](./backend/README.md))
- [x] Fase 5 — Frontend: dashboard en React con estado en vivo por modo, panel de alertas, panel de tarifas y búsqueda, todo conectado a la API real
- [x] Fase 6 — Mapa: mapa interactivo con Leaflet de las 90 estaciones de subte con coordenadas reales, coloreadas por línea
- [ ] Fase 7 — Estadísticas y calidad
- [ ] Fase 8 — Presentación final

## Autor

**Guillermo Guevara**
Estudiante de la Tecnicatura Universitaria en Programación y la Licenciatura en Informática — Universidad Nacional de Hurlingham.

## Licencia

Este proyecto todavía no tiene una licencia definida.
