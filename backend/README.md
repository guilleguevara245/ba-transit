# BA Transit

Plataforma web de informacion sobre transporte publico del Area Metropolitana
de Buenos Aires (AMBA) y CABA: trenes, subte, premetro, colectivos y
aeropuertos, con estados de servicio, alertas, tarifas, mapa, busqueda,
historial y estadisticas.

Este repositorio es el backend (API REST) del proyecto.

## Estado del proyecto

**Fase 1 — Base.** Repositorio y estructura inicial, Spring Boot,
PostgreSQL, Docker Compose, configuracion por variables de entorno, primer
endpoint de estado y CI. Todavia no hay modelo de datos ni datos reales
cargados: eso llega en la Fase 2 y 3.

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

2. Levantar todo con Docker Compose:

   ```bash
   docker compose --env-file .env up --build
   ```

3. Verificar que el servicio esta arriba:

   ```bash
   curl http://localhost:8080/api/v1/status
   ```

   Deberia devolver algo como:

   ```json
   { "service": "ba-transit-backend", "status": "UP", "timestamp": "..." }
   ```

   El endpoint estandar de Spring Boot Actuator tambien esta disponible en
   `http://localhost:8080/actuator/health`.

## Variables de entorno

| Variable      | Descripcion                          | Default (local) |
| ------------- | ------------------------------------- | ---------------- |
| `DB_HOST`     | Host de PostgreSQL                    | `localhost`       |
| `DB_PORT`     | Puerto de PostgreSQL                  | `5432`            |
| `DB_NAME`     | Nombre de la base de datos            | `batransit`       |
| `DB_USER`     | Usuario de la base de datos           | `batransit`       |
| `DB_PASSWORD` | Password de la base de datos          | `batransit`       |
| `SERVER_PORT` | Puerto en el que corre el backend     | `8080`            |

Ninguna credencial esta hardcodeada: todas se resuelven via variables de
entorno, con defaults solo para desarrollo local.

## Correrlo sin Docker (requiere PostgreSQL local)

```bash
mvn spring-boot:run
```

## Tests

```bash
mvn clean verify
```

## Arquitectura

Backend en capas: `controller` -> `service` -> `repository` -> `domain`.
La logica de negocio no vive en los controllers. El detalle completo de la
arquitectura se documenta a medida que se agreguen las fases siguientes.

## Roadmap

- [x] Fase 1 — Base
- [ ] Fase 2 — Modelo de datos y carga de datasets estaticos
- [ ] Fase 3 — API de lineas, estados, alertas, tarifas y busqueda
- [ ] Fase 4 — Actualizacion automatica desde fuentes oficiales
- [ ] Fase 5 — Frontend
- [ ] Fase 6 — Mapa
- [ ] Fase 7 — Estadisticas y calidad
- [ ] Fase 8 — Presentacion final
