package com.bulletrani.security;

import java.util.Locale;
import java.util.Set;

/**
 * Fail-fast checks before Spring Boot starts. Called from main after .env load.
 */
public final class SecurityBootstrap {
  private SecurityBootstrap() {}

  private static final Set<String> WEAK_JWT = Set.of(
      "aviator_super_secret_jwt_key_2026",
      "secret",
      "changeme",
      "jwt_secret",
      "your-secret-key"
  );

  private static final Set<String> WEAK_ADMIN_PASSWORDS = Set.of(
      "123456", "password", "admin", "admin123", "pass1234", "qwerty", "12345678"
  );

  public static void assertSecureOrDie() {
    String jwt = env("JWT_SECRET");
    if (jwt == null || jwt.isBlank()) {
      die("JWT_SECRET is required in backend-java/.env (min 32 characters, non-default).");
    }
    if (jwt.getBytes(java.nio.charset.StandardCharsets.UTF_8).length < 32) {
      die("JWT_SECRET must be at least 32 bytes.");
    }
    if (WEAK_JWT.contains(jwt.toLowerCase(Locale.ROOT)) || jwt.toLowerCase(Locale.ROOT).contains("super_secret")) {
      die("JWT_SECRET is a known default / weak value. Generate a new random secret.");
    }

    String adminPass = env("ADMIN_PASSWORD");
    if (adminPass == null || adminPass.isBlank()) {
      die("ADMIN_PASSWORD is required in backend-java/.env (used to seed/rotate the admin account).");
    }
    if (adminPass.length() < 10) {
      die("ADMIN_PASSWORD must be at least 10 characters.");
    }
    if (WEAK_ADMIN_PASSWORDS.contains(adminPass.toLowerCase(Locale.ROOT))) {
      die("ADMIN_PASSWORD is too weak / is a known default.");
    }
  }

  private static String env(String key) {
    String v = System.getenv(key);
    if (v == null || v.isBlank()) v = System.getProperty(key);
    return v;
  }

  private static void die(String msg) {
    System.err.println("SECURITY: " + msg);
    throw new IllegalStateException(msg);
  }
}
