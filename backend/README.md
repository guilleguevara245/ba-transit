# BA Transit: backend

API REST de [BA Transit](https://ba-transit.onrender.com) (Java 21 + Spring Boot 3.5 + PostgreSQL). Reune las
fuentes de transporte del AMBA (API Transporte de la Ciudad, Trenes Argentinos, Ferrovias, Metrovias, SMN, TomTom,
adsb.lol, Open-Meteo y Georef), las guarda o las cachea y las sirve al frontend. Tambien maneja las cuentas de
usuario, las sesiones por dispositivo y los avisos Web Push.

La descripcion general del proyecto esta en el [README principal](../README.md).

## Stack

- Java 21 + Spring Boot 3.5 (Spring Web, Data JPA, Validation, Actuator)
- PostgreSQL 16 (Neon en produccion) con Flyway
- springdoc-openapi (Swagger UI)
- Maven, Docker + Docker Compose, GitHub Actions (CI) y Render

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
| `AUTH_TOKEN_SECRET`          | Clave para firmar las sesiones (32+ caracteres) | (vacio = clave temporal: las sesiones se pierden al reiniciar) |
| `GOOGLE_CLIENT_ID`           | ID de cliente de Google (publico)        | (vacio = sin "Continuar con Google") |
| `BREVO_API_KEY`, `MAIL_FROM` | Mails para recuperar la contrasena y del contacto (Brevo) | (vacio = sin recuperar contrasena ni contacto) |
| `CONTACT_EMAIL`              | A donde llegan los mensajes del formulario de contacto | (vacio = sin formulario de contacto) |
| `SITE_URL`                   | Direccion del sitio, para los links de los mails y los avisos | `https://ba-transit.onrender.com` |
| `DB_SSLMODE`                 | Modo SSL de la base                      | `prefer` (en produccion, `require`) |

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
- `GET /api/v1/subte/proximos`, `GET /api/v1/subte/horario`, `GET /api/v1/trenes/proximos` -
  proximos trenes en vivo o segun el horario
- `GET /api/v1/colectivos/vivo`, `GET /api/v1/ecobici`, `GET /api/v1/vuelos` - datos en vivo
- `GET /api/v1/clima/alertas`, `GET /api/v1/clima/pronostico` - alertas del SMN y pronostico
- `GET /api/v1/eventos`, `GET /api/v1/estado` - eventos masivos y salud de cada fuente
- `GET /api/v1/direcciones?q=` - direcciones del AMBA (Georef), con limite de pedidos por IP
- `/api/v1/auth/*` y `/api/v1/cuenta/*` - cuentas, sesiones por dispositivo, favoritos,
  lugares y preferencias (con el token de la sesion en `Authorization: Bearer`)
- `/api/v1/notificaciones/*` - suscripcion a los avisos Web Push
- `GET /api/v1/contacto`, `POST /api/v1/contacto` - formulario de contacto: lo manda por
  mail a `CONTACT_EMAIL` (no se guarda), con limite por IP y por dia; con la sesion
  iniciada agrega los datos de la cuenta

La lista completa, con los parametros, esta en Swagger UI.

## Arquitectura

Las lineas, estaciones, alertas y tarifas siguen las capas `controller` ->
`service` -> `repository` -> `domain`; lo demas esta agrupado por tema
(`live`, `colectivos`, `accesos`, `clima`, `vuelos`, `trenes`, `cuentas`,
`notificaciones`, `direcciones`, `estado`...), cada uno con su controller,
su servicio y su cliente de la fuente externa. La logica de negocio no vive
en los controllers. Las fuentes externas se consultan con timeouts y se
cachean; si una falla, se sirven los ultimos datos validos y queda
registrado en `estado`.

Seguridad, en corto:

- Escrituras de administracion con `X-API-Key` (comparada en tiempo
  constante); sin la clave configurada, la escritura queda deshabilitada.
- Contrasenas con PBKDF2-HMAC-SHA512 (210.000 iteraciones); las del formato
  anterior (SHA256) se pasan al nuevo al entrar.
- Sesiones firmadas con HMAC-SHA256, una por dispositivo, que se pueden
  cerrar; cambiar o recuperar la contrasena cierra las demas.
- Limites de intentos por IP real (`CF-Connecting-IP`, ver `ClientIp`) y
  por mail.
- Los avisos solo se mandan a servicios de push conocidos (https).
- Errores en formato Problem Details sin detalles internos; el XML externo
  se lee sin entidades externas.

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

