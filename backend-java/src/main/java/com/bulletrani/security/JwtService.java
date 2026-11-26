package com.bulletrani.security;

import com.bulletrani.config.AppProperties;
import com.bulletrani.store.Models.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Map;

@Service
public class JwtService {
  private final SecretKey key;
  private final int jwtDays;

  public JwtService(AppProperties props) {
    String secret = props.getJwtSecret();
    if (secret == null || secret.isBlank()) {
      throw new IllegalStateException("bulletrani.jwt-secret / JWT_SECRET is required");
    }
    byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
    if (bytes.length < 32) {
      throw new IllegalStateException("JWT_SECRET must be at least 32 bytes (no zero-padding)");
    }
    this.key = Keys.hmacShaKeyFor(bytes);
    this.jwtDays = props.getJwtDays();
  }

  public String issue(User user) {
    Instant now = Instant.now();
    return Jwts.builder()
        .claims(Map.of(
            "id", user.id,
            "username", user.username,
            "role", user.role
        ))
        .issuedAt(Date.from(now))
        .expiration(Date.from(now.plus(jwtDays, ChronoUnit.DAYS)))
        .signWith(key)
        .compact();
  }

  public Claims parse(String token) {
    return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
  }

  public Claims fromAuthHeader(String authHeader) {
    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
      throw new IllegalArgumentException("Unauthorized");
    }
    return parse(authHeader.substring(7));
  }
}
