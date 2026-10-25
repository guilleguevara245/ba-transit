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

ENTRYPOINT ["java", "-jar", "app.jar"]
