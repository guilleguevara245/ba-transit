# BA Transit

Plataforma web de informacion sobre transporte publico del Area Metropolitana
de Buenos Aires (AMBA) y CABA: trenes, subte, premetro, colectivos y
aeropuertos, con estados de servicio, alertas, tarifas, mapa, busqueda,
historial y estadisticas.

Este repositorio es el backend (API REST) del proyecto.

## Estado del proyecto

**Fases 1 a 6 completas (Fase 4 solo para subte; el mapa solo tiene datos de subte por ahora).**

- Fase 1 (base): Spring Boot, PostgreSQL, Docker Compose, CI, variables de
  entorno.
- Fase 2 (modelo de datos): lineas, ramales y estaciones reales de subte
  (90 estaciones) y las 8 lineas de tren AMBA, versionadas con Flyway.
- Fase 3 (API): alertas, tarifas por tramo de distancia, y busqueda
  combinada de lineas y estaciones.
- Fase 4 (actualizacion automatica): job programado (cada 5 minutos) que
  sincroniza alertas de subte desde la API Transporte oficial de Buenos
  Aires (`apitransporte.buenosaires.gob.ar`), con reintentos ante fallos y
  sin destruir datos si la fuente no responde.
- Fase 5 (frontend): dashboard en React con estado en vivo por modo,
  panel de alertas, panel de tarifas y busqueda, conectado a la API real.
- Fase 6 (mapa): mapa interactivo con Leaflet de las 90 estaciones de
  subte, coloreadas por linea, con coordenadas reales.

## Colectivos y trenes en la Fase 4

La API Transporte de Buenos Aires no expone un recurso `/trenes`, y el
endpoint de alertas de `/colectivos` no incluye un identificador de linea
utilizable (el campo `route_id` viene vacio). El endpoint de posiciones en
tiempo real de colectivos (`vehiclePositionsSimple`) devuelve actualmente
un error interno del servidor en vez de datos. Por estas limitaciones de
la fuente oficial, la sincronizacion automatica de la Fase 4 se implemento
solo para subte, que si expone datos completos y confiables.

## Alcance de las estaciones y ramales de tren

Las 8 lineas de tren del AMBA tienen ramales y estaciones reales cargados,
pero no todos los ramales existentes: se excluyeron a proposito los
servicios de larga distancia (ej. San Martin hacia Junin/Rufino), los
ramales diesel de menor frecuencia (Sarmiento: Moreno-Mercedes,
Merlo-Lobos), extensiones fuera del AMBA (Roca: Ezeiza, Alejandro Korn,
Bosques, Canuelas, Lobos, Monte, Chascomus; Mitre: Zarate, Capilla del
Senor; Belgrano Sur: Gonzalez Catan-Lozano), y el ramal Puente
Alsina-Aldo Bonzi de Belgrano Sur, que esta confirmado que actualmente no
esta en servicio. El criterio en todos los casos fue el mismo: cargar los
ramales urbanos principales con buena frecuencia dentro del AMBA, y dejar
el resto para una etapa posterior en vez de forzar datos de menor calidad
o fuera del alcance real del proyecto.

## Stack

- Java 21 + Spring Boot 3.3
- PostgreSQL 16
- Maven
- Docker + Docker Compose
- GitHub Actions (CI)

## Como ejecutarlo localmente

1. Copiar el archivo de variables de entorno de ejemplo:

   ```bash
   cp .env.example .env
   ```

2. Completar en `.env` el `TRANSPORTE_CLIENT_ID` y `TRANSPORTE_CLIENT_SECRET`
   propios (se obtienen registrandose gratis en
   `apitransporte.buenosaires.gob.ar/registro`). Sin esto, el job de
   sincronizacion de alertas falla al autenticarse, pero el resto de la
   aplicacion funciona igual.

3. Levantar todo con Docker Compose:

   ```bash
   docker compose --env-file .env up --build
   ```

   O, para desarrollo dia a dia sin reconstruir la imagen cada vez:

   ```bash
   docker compose up -d postgres
   set -a; source .env; set +a
   mvn spring-boot:run
   ```

4. Verificar que el servicio esta arriba:

   ```bash
   curl http://localhost:8080/api/v1/status
   ```

## Variables de entorno

| Variable                    | Descripcion                             | Default (local) |
| ---------------------------- | ---------------------------------------- | ----------------- |
| `DB_HOST`                    | Host de PostgreSQL                       | `localhost`        |
| `DB_PORT`                    | Puerto de PostgreSQL                     | `5432`             |
| `DB_NAME`                    | Nombre de la base de datos               | `batransit`        |
| `DB_USER`                    | Usuario de la base de datos              | `batransit`        |
| `DB_PASSWORD`                | Password de la base de datos             | `batransit`        |
| `SERVER_PORT`                | Puerto en el que corre el backend        | `8080`             |
| `TRANSPORTE_CLIENT_ID`       | Credencial de la API Transporte de BA    | (vacio)            |
| `TRANSPORTE_CLIENT_SECRET`   | Credencial de la API Transporte de BA    | (vacio)            |

Ninguna credencial esta hardcodeada: todas se resuelven via variables de
entorno. El `.env` real nunca se sube al repositorio (esta en
`.gitignore`).

## Tests

```bash
docker compose up -d postgres
mvn clean verify
```

## API

Endpoints principales (ver el codigo fuente para el detalle completo):

- `GET /api/v1/status` - estado del servicio
- `GET /api/v1/lines`, `GET /api/v1/lines/{mode}` - lineas de transporte
- `GET /api/v1/lines/{lineId}/branches` - ramales de una linea
- `GET /api/v1/branches/{branchId}/stations` - estaciones de un ramal
- `GET /api/v1/alerts`, `POST /api/v1/alerts` - alertas de servicio
- `GET /api/v1/lines/{lineId}/alerts` - alertas de una linea
- `GET /api/v1/fares`, `GET /api/v1/fares/{mode}`, `POST /api/v1/fares` -
  tarifas
- `GET /api/v1/search?q=texto` - busqueda combinada de lineas y estaciones
- `GET /api/v1/map/stations?mode=SUBTE` - estaciones con coordenadas para
  el mapa (solo subte tiene coordenadas cargadas por ahora)

## Arquitectura

Backend en capas: `controller` -> `service` -> `repository` -> `domain`.
La logica de negocio no vive en los controllers. La integracion con la API
externa vive en `client` (llamadas HTTP con reintentos), `config`
(propiedades tipadas) y `scheduler` (el job programado).

## Roadmap

- [x] Fase 1 - Base
- [x] Fase 2 - Modelo de datos y carga de datasets estaticos
- [x] Fase 3 - API de lineas, estados, alertas, tarifas y busqueda
- [x] Fase 4 - Actualizacion automatica (solo subte, ver limitaciones arriba)
- [x] Fase 5 - Frontend
- [x] Fase 6 - Mapa (solo subte, ver limitaciones arriba)
- [ ] Fase 7 - Estadisticas y calidad
- [ ] Fase 8 - Presentacion final
