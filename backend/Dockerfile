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
# limite y Render reiniciaba el servicio. Con el heap al 55% siguio pasando
# de vez en cuando: el heap crece hasta el tope y no se devuelve. Ahora:
#  - heap al 45% (unos 230 MB), y despues de cada limpieza el heap vuelve a
#    achicarse (Min/MaxHeapFreeRatio), asi un pico no queda reservado;
#  - solo el compilador C1 (TieredStopAtLevel=1): C2 genera picos de memoria
#    nativa al compilar y llena mas la cache de codigo, y este servidor no
#    necesita esa velocidad extra;
#  - metaspace, cache de codigo y buffers directos con tope, y pilas de hilos
#    mas chicas;
#  - SerialGC: el recolector con menos memoria extra (hay un solo CPU);
#  - si igual se quedara sin heap, la JVM sale y Render la levanta limpia,
#    en vez de seguir funcionando a medias (y queda en el log como
#    OutOfMemoryError, distinto del limite de Render).
# MemoryReport deja en el log cuanta memoria usa cada 10 minutos.
ENTRYPOINT ["java", \
  "-XX:MaxRAMPercentage=45", \
  "-XX:MinHeapFreeRatio=10", \
  "-XX:MaxHeapFreeRatio=30", \
  "-XX:TieredStopAtLevel=1", \
  "-XX:MaxMetaspaceSize=150m", \
  "-XX:ReservedCodeCacheSize=32m", \
  "-XX:MaxDirectMemorySize=32m", \
  "-Xss512k", \
  "-XX:+UseSerialGC", \
  "-XX:+ExitOnOutOfMemoryError", \
  "-jar", "app.jar"]
