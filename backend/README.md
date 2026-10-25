# BA Transit

Plataforma web de informacion sobre transporte publico del Area Metropolitana
de Buenos Aires (AMBA) y CABA: trenes, subte, premetro, colectivos y
aeropuertos, con estados de servicio, alertas, tarifas, mapa, busqueda,
historial y estadisticas.

Este repositorio es el backend (API REST) del proyecto.

## Estado del proyecto

**Fases 1 a 7 completas (Fase 4 solo para subte). El mapa incluye subte y trenes.**

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
- Fase 7 (estadisticas): endpoint de estadisticas de alertas por linea
  (total historico, activas, tipo mas frecuente), con agregacion SQL en
  el backend, y pagina de estadisticas en el frontend.
- Ronda de calidad (v4.6 a v4.30): correcciones en la sincronizacion,
  timeouts y credenciales fuera de los logs, API key para escrituras,
  errores con Problem Details, DTOs, enum de modos, busqueda sin
  tildes, TIMESTAMPTZ, tarifas vigentes, tests y Swagger UI.

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

- Java 21 + Spring Boot 3.5
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
| `FRONTEND_ORIGINS`           | Origenes permitidos por CORS (coma)      | `http://localhost:5173` |
| `ADMIN_API_KEY`              | Clave para los endpoints de escritura    | (vacio = escritura deshabilitada) |
| `COLECTIVOS_GTFS_URL`        | URL del feed GTFS de colectivos (zip)    | (vacio = API Transporte, `/colectivos/feed-gtfs`) |
| `TOMTOM_API_KEY`             | Clave de la API de trafico de TomTom     | (vacio = Accesos sin estado en vivo) |

Los endpoints de escritura (`POST`) requieren el header `X-API-Key` con
el valor de `ADMIN_API_KEY`. Las lecturas (`GET`) son publicas. Ejemplo:

```bash
curl -X POST http://localhost:8080/api/v1/alerts \
  -H "Content-Type: application/json" -H "X-API-Key: $ADMIN_API_KEY" \
  -d '{"lineId": 1, "type": "DEMORA", "description": "Demoras por obras", "source": "Manual"}'
```

Ninguna credencial esta hardcodeada: todas se resuelven via variables de
entorno. El `.env` real nunca se sube al repositorio (esta en
`.gitignore`).

## Tests

```bash
docker compose up -d postgres
mvn clean verify
```

## API

La documentacion interactiva (Swagger UI) queda disponible con el
backend corriendo en http://localhost:8080/swagger-ui.html, y la
especificacion OpenAPI en http://localhost:8080/v3/api-docs. Desde
Swagger UI se pueden probar los endpoints; para los `POST`, cargar la
clave con el boton "Authorize".

Todos los errores responden con el formato Problem Details
(`application/problem+json`): `status`, `title`, `detail` y, en errores
de validacion, `errors` con el campo invalido.

Endpoints principales:

- `GET /api/v1/status` - estado del servicio
- `GET /api/v1/lines`, `GET /api/v1/lines?mode=SUBTE` - lineas de transporte
- `GET /api/v1/lines/{lineId}` - una linea por id
- `GET /api/v1/lines/{lineId}/branches` - ramales de una linea
- `GET /api/v1/branches/{branchId}/stations` - estaciones de un ramal
- `GET /api/v1/alerts`, `POST /api/v1/alerts` - alertas de servicio
- `GET /api/v1/lines/{lineId}/alerts` - alertas de una linea
- `GET /api/v1/fares`, `GET /api/v1/fares?mode=TREN`, `POST /api/v1/fares` -
  tarifas
- `GET /api/v1/search?q=texto` - busqueda combinada de lineas y estaciones
- `GET /api/v1/map/stations`, `GET /api/v1/map/stations?mode=TREN` -
  estaciones con coordenadas para el mapa (subte y trenes; fuente de las
  coordenadas de tren: Buenos Aires Data, "Estaciones de ferrocarril")
- `GET /api/v1/colectivos/estado` - si los datos de colectivos estan cargados
- `GET /api/v1/colectivos?q=152` - busqueda de lineas de colectivo
- `GET /api/v1/colectivos/{routeId}` - recorrido y paradas de cada sentido
- `GET /api/v1/accesos` - estado del transito en los cuatro accesos principales
- `GET /api/v1/servicios-especiales?lineId=` - servicios especiales vigentes hoy
- `GET /api/v1/stats/alerts` - estadisticas de alertas por linea (total,
  activas, tipo mas frecuente)

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
- [x] Fase 6 - Mapa (subte y trenes; premetro sin coordenadas todavia)
- [x] Fase 7 - Estadisticas y calidad
- [ ] Fase 8 - Presentacion final

## Colectivos

Los recorridos y paradas de colectivos salen del feed GTFS estatico. Por
defecto se descarga de la API Transporte (`/colectivos/feed-gtfs`, con
las mismas credenciales que las alertas) un minuto despues del arranque
y despues una vez por dia. El feed pesa cientos de MB, asi que se procesa
por partes y en memoria solo queda un recorrido representativo por linea
y sentido, con sus paradas. Mientras no hay datos cargados, los endpoints
responden 503. Para usar otra fuente, definir `COLECTIVOS_GTFS_URL` con
la URL del zip.

Para que la seccion responda apenas arranca el servidor (en el plan
gratuito de Render se duerme tras unos minutos sin uso), los datos ya
procesados se guardan comprimidos en la tabla `colectivos_snapshot` y
se cargan desde ahi al arrancar. El feed solo se vuelve a descargar si
la copia tiene mas de 24 horas (si la descarga falla, se reintenta a
las 6 horas).

Para verificar que la API devuelve el feed con tus credenciales:

```bash
curl -sS -o /tmp/feed.zip -w "%{http_code} %{size_download}\n" \
  "https://apitransporte.buenosaires.gob.ar/colectivos/feed-gtfs?client_id=$TRANSPORTE_CLIENT_ID&client_secret=$TRANSPORTE_CLIENT_SECRET"
```

## Accesos

El estado de las autopistas (Buenos Aires - La Plata, Acceso Norte,
Acceso Oeste y Riccheri / Ezeiza-Canuelas) se mide con la API Traffic
Flow de TomTom en dos puntos por acceso, definidos en
`src/main/resources/accesos.json`. Para no pasar el plan gratuito
(20.000 consultas por mes) la medicion se guarda 20 minutos y solo se
consulta cuando alguien abre la pagina: como mucho 8 x 72 = 576
consultas por dia.

El estado sale de comparar la velocidad actual con la velocidad sin
transito del tramo: 75% o mas es fluido, entre 45% y 75% demorado y
menos de 45% congestionado. Si TomTom devuelve una calle que no es
autopista o ruta principal, el tramo se marca para revisar: hay que
corregir su latitud y longitud en `accesos.json` (el mapa de `/accesos`
muestra donde cayo cada punto).

Sin `TOMTOM_API_KEY` la pagina muestra los accesos y sus concesionarias,
sin estado en vivo. Para probar la clave (sin pegarla en la terminal):

```bash
read -rs TOMTOM_API_KEY && export TOMTOM_API_KEY
curl -sS "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=-34.7005,-58.2775&unit=KMPH&key=$TOMTOM_API_KEY"
```

## Servicios especiales de trenes

Trenes rapidos, diferenciales, servicios por eventos o cambios de
recorrido. No hay una fuente publica con estos datos, asi que se cargan
a mano y se muestran en el inicio y en la pagina de la linea solo
mientras estan vigentes (fechas en hora de Buenos Aires):

```bash
read -rs ADMIN_API_KEY && export ADMIN_API_KEY
curl -sS -X POST https://ba-transit-api.onrender.com/api/v1/servicios-especiales \
  -H "X-API-Key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"lineId": 3, "title": "Tren rapido", "description": "Once - Moreno sin paradas entre Liniers y Castelar",
       "days": "Lunes a viernes", "schedule": "Salidas de Once 17:30 y 18:30",
       "validFrom": "2026-11-02", "validUntil": "2026-12-18"}'
```

`validUntil` es opcional (sin fecha de fin). Para darlo de baja:
`DELETE /api/v1/servicios-especiales/{id}` con el mismo header. El
`lineId` de cada linea sale de `GET /api/v1/lines`.

