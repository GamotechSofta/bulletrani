# syntax=docker/dockerfile:1

# ── Build ───────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

# Private Provider SDK (not on Maven Central) — vendored under libs/
COPY libs/game-sdk-1.0.0.jar libs/game-sdk-1.0.0.pom ./libs/
RUN mvn -q install:install-file \
      -Dfile=libs/game-sdk-1.0.0.jar \
      -DpomFile=libs/game-sdk-1.0.0.pom \
      -DgroupId=in.oreng \
      -DartifactId=game-sdk \
      -Dversion=1.0.0 \
      -Dpackaging=jar

COPY pom.xml mvnw ./
COPY .mvn .mvn
COPY src src
RUN chmod +x mvnw \
 && ./mvnw -B -DskipTests package \
 && mv target/backend-*.jar target/app.jar

# ── Runtime ─────────────────────────────────────────────
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

RUN useradd --system --uid 10001 --create-home bulletrani \
 && apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*

COPY --from=build /build/target/app.jar /app/app.jar
USER bulletrani

EXPOSE 5000 5001

ENV SERVER_PORT=5000 \
    SOCKET_HOST=0.0.0.0 \
    SOCKET_PORT=5001 \
    JAVA_TOOL_OPTIONS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

HEALTHCHECK --interval=20s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS http://127.0.0.1:5000/api/health || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
