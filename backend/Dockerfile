FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests -B

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Correr como usuario sin privilegios en vez de root.
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/target/*.jar app.jar
USER app

EXPOSE 8080

# Docker (y docker compose) marcan el contenedor como "unhealthy" si el
# actuator deja de responder. PORT lo inyecta Render; en local es 8080.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- "http://localhost:${PORT:-8080}/actuator/health" | grep -q '"UP"' || exit 1

# Memoria para una instancia de 512 MB. Con el heap al 75% (384 MB), lo que
# la JVM usa fuera del heap (clases, codigo compilado, hilos, GC) pasaba el
# limite y Render reiniciaba el servicio. Ahora:
#  - heap al 55% (unos 280 MB): alcanza para procesar el feed de colectivos;
#  - metaspace y cache de codigo con tope, y pilas de hilos mas chicas;
#  - SerialGC: el recolector con menos memoria extra (hay un solo CPU);
#  - si igual se quedara sin heap, la JVM sale y Render la levanta limpia,
#    en vez de seguir funcionando a medias.
ENTRYPOINT ["java", \
  "-XX:MaxRAMPercentage=55", \
  "-XX:MaxMetaspaceSize=150m", \
  "-XX:ReservedCodeCacheSize=48m", \
  "-Xss512k", \
  "-XX:+UseSerialGC", \
  "-XX:+ExitOnOutOfMemoryError", \
  "-jar", "app.jar"]
