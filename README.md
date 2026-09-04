# BA Transit

Plataforma web de informacion sobre transporte publico del Area
Metropolitana de Buenos Aires (AMBA) y CABA: trenes, subte, premetro,
colectivos y aeropuertos, con estados de servicio, alertas, tarifas, mapa,
busqueda, historial y estadisticas.

## Estructura del repositorio

```
ba-transit/
├── backend/     API REST (Java 21 + Spring Boot + PostgreSQL)
├── frontend/    Cliente web (Fase 5 en adelante)
└── design/      Mockups y referencias visuales
```

## Estado del proyecto

**Fase 1 completa.** El backend levanta con Docker Compose, se conecta a
PostgreSQL y responde en `/api/v1/status`. Todavia no hay modelo de datos
real: eso es la Fase 2.

- [x] Fase 1 — Base
- [ ] Fase 2 — Modelo de datos y carga de datasets estaticos
- [ ] Fase 3 — API de lineas, estados, alertas, tarifas y busqueda
- [ ] Fase 4 — Actualizacion automatica desde fuentes oficiales
- [ ] Fase 5 — Frontend
- [ ] Fase 6 — Mapa
- [ ] Fase 7 — Estadisticas y calidad
- [ ] Fase 8 — Presentacion final

## Como correr el backend

Ver [`backend/README.md`](./backend/README.md) para instrucciones
detalladas (variables de entorno, Docker Compose, tests).

Resumen rapido:

```bash
cd backend
cp .env.example .env
docker compose --env-file .env up --build
curl http://localhost:8080/api/v1/status
```

## Diseño

El mockup de referencia del dashboard esta en
[`design/dashboard-mockup.html`](./design/dashboard-mockup.html).
Paleta amarillo/negro, modo oscuro, inspirada en la senaletica de Caterpillar
y del Tren Urquiza.
