<p align="center">
  <img src="design/ba-transit-logo.jpg" alt="BA Transit" width="800">
</p>

<p align="center">
  <img src="https://github.com/guilleguevara245/ba-transit/actions/workflows/ci.yml/badge.svg" alt="CI">
  <img src="https://img.shields.io/badge/Java-21-blue" alt="Java 21">
  <img src="https://img.shields.io/badge/React-Vite-61DAFB" alt="React + Vite">
  <img src="https://img.shields.io/badge/status-en%20desarrollo-yellow" alt="En desarrollo">
  <img src="https://img.shields.io/badge/license-MIT-lightgrey" alt="Licencia MIT">
</p>

# BA Transit

Plataforma web de información sobre transporte público del Área Metropolitana de Buenos Aires (AMBA) y CABA, desarrollada en Java + Spring Boot con frontend en React.

## Descripción

BA Transit resuelve un problema que cualquiera que viaje en transporte público de Buenos Aires conoce de memoria: la información sobre el estado del servicio, las alertas y las tarifas está dispersa entre distintas fuentes oficiales, cada una con su propio formato, y no siempre es fácil de consultar rápido antes de salir de casa.

Este proyecto nace de esa fricción cotidiana. La idea es centralizar en un solo lugar el estado en vivo de subte, trenes, premetro y colectivos del AMBA: qué líneas están funcionando con normalidad, qué alertas hay activas, cuánto sale el viaje según el tramo, y poder buscar una línea o estación sin tener que recordar en qué app oficial mirar cada cosa.

El backend sincroniza automáticamente las alertas de subte desde la API Transporte oficial de la Ciudad de Buenos Aires, así el dato que ve el usuario está actualizado sin intervención manual. El resto del proyecto (colectivos, trenes, estadísticas) se está construyendo por fases, documentando en cada paso qué está terminado y qué no — prefiero mostrar el progreso real antes que simular que el proyecto ya está completo.

## Funcionalidades

- Consulta de líneas de transporte por modo (subte, tren, premetro) con sus ramales y estaciones, y una página de detalle por línea con su recorrido y sus alertas
- Alertas de servicio por línea, con sincronización automática desde la API Transporte de Buenos Aires (cada 5 minutos, solo subte por ahora — ver limitaciones en [`backend/README.md`](./backend/README.md))
- Tarifas vigentes por modo y tramo de distancia (subte, colectivos y trenes)
- Búsqueda combinada de líneas y estaciones, sin distinguir tildes ni mayúsculas, con resultados navegables con teclado
- Página de inicio en React con estado en vivo por modo, panel de alertas y panel de tarifas, que se actualiza sola cada minuto
- Mapa interactivo (Leaflet + OpenStreetMap) de la red completa: 90 estaciones de subte y 165 de tren con coordenadas reales, el recorrido de cada línea y filtros por modo; cada estación muestra su posición en el recorrido, sus combinaciones y las alertas de la línea
- Página por modo (Trenes, Subtes, Premetro) con el estado de cada línea y su mapa, y detalle de cada línea con la lista de estaciones y un minimapa
- Endpoint de estadísticas de alertas por línea (total histórico, activas, tipo más frecuente), calculadas con agregación SQL en el backend
- Base de datos versionada con migraciones Flyway, sin pérdida de datos entre cambios de esquema
- Endpoints de escritura protegidos con API key y errores con formato estándar (Problem Details, RFC 9457)
- Documentación interactiva de la API con Swagger UI

## Tecnologías

**Backend**
- **Java 21** + **Spring Boot 3.5**
- **PostgreSQL 16**
- **Flyway** para migraciones versionadas
- **Docker** + **Docker Compose**
- **springdoc-openapi** (Swagger UI) para documentar la API
- **JUnit 5**, **Mockito** y **MockMvc** para tests
- **GitHub Actions** para integración continua

**Frontend**
- **React** + **Vite**
- **React Router** para la navegación entre Inicio, Mapa y el detalle de cada línea
- **Leaflet** + **React Leaflet** para el mapa interactivo
- Hooks propios para consumo de API con refresco periódico, debounce de búsqueda y reloj
- **ESLint** + **Vitest**

## Estructura del proyecto

```
ba-transit/
├── backend/                 # API REST (Java 21 + Spring Boot + PostgreSQL)
│   ├── src/main/java/com/batransit/api/
│   │   ├── controller/      # Endpoints HTTP
│   │   ├── service/         # Lógica de negocio
│   │   ├── dto/             # Objetos de entrada y salida de la API
│   │   ├── domain/          # Entidades JPA y enums
│   │   ├── client/          # Integración con la API Transporte externa
│   │   ├── scheduler/       # Job de sincronización automática de alertas
│   │   ├── security/        # API key para los endpoints de escritura
│   │   └── exception/       # Manejo de errores (Problem Details)
│   └── src/main/resources/db/migration/   # Migraciones Flyway
├── frontend/                # Cliente web (React + Vite)
│   └── src/
│       ├── pages/           # Inicio, Mapa y detalle de línea
│       ├── components/      # Header, navegación, búsqueda, paneles
│       ├── hooks/           # useApi, useDebounce, useNow
│       └── utils/           # Lógica pura (con tests): resumen por modo, mapa, búsqueda, formatos
├── design/                  # Mockups y referencias visuales
├── .github/workflows/       # CI de backend y frontend
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
# y ADMIN_API_KEY si se van a cargar alertas o tarifas por POST
docker compose --env-file .env up --build
```

Instrucciones completas, variables de entorno y documentación de la API en [`backend/README.md`](./backend/README.md).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

En desarrollo, el proxy de Vite reenvía `/api` al backend en `http://localhost:8080`, así que no hace falta configurar nada. Para producción, definir `VITE_API_BASE_URL` con la URL pública del backend (ver `frontend/.env.example`).

## Uso

Con el backend y el frontend corriendo, la página de inicio queda disponible en `http://localhost:5173` (puerto por defecto de Vite). Desde ahí se puede buscar una línea o estación, ver el estado en vivo por modo de transporte, consultar alertas y tarifas activas y explorar el mapa de la red en la pestaña "Mapa". Cada tarjeta de "Estado de la red" lleva a la página de ese modo. Al elegir un resultado de búsqueda se abre el detalle de la línea, con sus ramales, estaciones y alertas.

La documentación interactiva de la API está en `http://localhost:8080/swagger-ui.html`.

Para probar solo el backend:

```bash
curl http://localhost:8080/api/v1/status
curl http://localhost:8080/api/v1/lines?mode=SUBTE
curl "http://localhost:8080/api/v1/search?q=peru"
curl http://localhost:8080/api/v1/map/stations
```

## Tests

### Backend

```bash
cd backend
docker compose up -d postgres
mvn clean verify
```

### Frontend

```bash
cd frontend
npm run lint
npm test
```

Un workflow de GitHub Actions corre en cada `push` y `pull request` a `main`, con dos jobs: el backend (build, tests unitarios, de controllers y de repositorios contra PostgreSQL) y el frontend (ESLint, tests con Vitest y build de producción).

## Estado del proyecto

**Fases 1 a 7 completas (Fase 4 solo para subte). El mapa ya incluye subte y trenes.**

- [x] Fase 1 — Base: Spring Boot, PostgreSQL, Docker Compose, CI
- [x] Fase 2 — Modelo de datos: líneas, ramales y estaciones reales de subte (90 estaciones) y de las 8 líneas de tren AMBA, versionadas con Flyway *(algunos ramales de trenes de larga distancia o fuera de servicio quedaron fuera del alcance a propósito — ver detalle en [`backend/README.md`](./backend/README.md))*
- [x] Fase 3 — API: alertas, tarifas por tramo de distancia y búsqueda combinada de líneas y estaciones
- [x] Fase 4 — Actualización automática: job programado que sincroniza alertas de subte desde la API Transporte oficial (ver limitaciones en [`backend/README.md`](./backend/README.md))
- [x] Fase 5 — Frontend: dashboard en React con estado en vivo por modo, panel de alertas, panel de tarifas y búsqueda, todo conectado a la API real
- [x] Fase 6 — Mapa: mapa interactivo con Leaflet de las 90 estaciones de subte con coordenadas reales, coloreadas por línea
- [x] Fase 7 — Estadísticas: endpoint de estadísticas de alertas por línea, página de estadísticas en el frontend con gráfico de barras (la página se retiró después; el endpoint sigue disponible)
- [x] Ronda de calidad — correcciones de sincronización y seguridad, API key para escrituras, errores estándar, DTOs, búsqueda sin tildes, tarifas vigentes, tests de backend y frontend, CI del frontend, detalle de línea, recorridos en el mapa y Swagger UI
- [ ] Fase 8 — Presentación final

## Autor

**Guillermo Guevara**
Estudiante de la Tecnicatura Universitaria en Programación y la Licenciatura en Informática — Universidad Nacional de Hurlingham.

## Licencia

Este proyecto está bajo licencia MIT — ver [`LICENSE`](./LICENSE) para el detalle completo.
