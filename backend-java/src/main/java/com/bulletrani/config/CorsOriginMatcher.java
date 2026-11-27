package com.bulletrani.config;

import org.springframework.web.cors.CorsConfiguration;

import java.util.Arrays;
import java.util.List;

/** Shared CORS allowlist from {@code CORS_ORIGINS} (.env → bulletrani.cors-origins). */
public final class CorsOriginMatcher {
  private CorsOriginMatcher() {}

  public static List<String> parse(String raw) {
    String source = (raw == null || raw.isBlank()) ? "http://localhost:*" : raw;
    return Arrays.stream(source.split(","))
        .map(String::trim)
        .filter(s -> !s.isEmpty())
        .toList();
  }

  /**
   * @return true if {@code origin} is allowed (or absent — non-browser clients).
   */
  public static boolean isAllowed(String origin, String corsOriginsRaw) {
    if (origin == null || origin.isBlank()) {
      return true;
    }
    CorsConfiguration cors = new CorsConfiguration();
    for (String pattern : parse(corsOriginsRaw)) {
      if ("*".equals(pattern)) {
        return true;
      }
      cors.addAllowedOriginPattern(pattern);
    }
    return cors.checkOrigin(origin) != null;
  }
}
