package com.bulletrani.web;

import com.bulletrani.security.AuthRateLimiter;
import com.bulletrani.security.JwtService;
import com.bulletrani.store.DataStore;
import com.bulletrani.store.Models.User;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final DataStore db;
  private final JwtService jwt;
  private final AuthRateLimiter rateLimiter;

  public AuthController(DataStore db, JwtService jwt, AuthRateLimiter rateLimiter) {
    this.db = db;
    this.jwt = jwt;
    this.rateLimiter = rateLimiter;
  }

  @PostMapping("/register")
  public ResponseEntity<?> register(@RequestBody Map<String, String> body, HttpServletRequest req) {
    String ip = clientIp(req);
    String blocked = rateLimiter.check(ip);
    if (blocked != null) {
      return ResponseEntity.status(429).body(Map.of("error", blocked));
    }
    String username = body.get("username");
    String email = body.get("email");
    String password = body.get("password");
    if (username == null || email == null || password == null) {
      return ResponseEntity.badRequest().body(Map.of("error", "All fields are required"));
    }
    if (password.length() < 8) {
      rateLimiter.recordFailure(ip);
      return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 8 characters"));
    }
    if (db.existsUsernameOrEmail(username, email)) {
      rateLimiter.recordFailure(ip);
      return ResponseEntity.badRequest().body(Map.of("error", "Username or email already in use"));
    }
    User user = db.createUser(username, email, password, 0, "player");
    rateLimiter.recordSuccess(ip);
    String token = jwt.issue(user);
    return ResponseEntity.ok(Map.of("success", true, "token", token, "user", publicUser(user)));
  }

  @PostMapping("/login")
  public ResponseEntity<?> login(@RequestBody Map<String, String> body, HttpServletRequest req) {
    String ip = clientIp(req);
    String blocked = rateLimiter.check(ip);
    if (blocked != null) {
      return ResponseEntity.status(429).body(Map.of("error", blocked));
    }
    String login = firstNonBlank(body.get("login"), body.get("username"), body.get("email"));
    String password = body.get("password");
    if (login == null || password == null || password.isBlank()) {
      return ResponseEntity.badRequest().body(Map.of("error", "Login and password required"));
    }
    User user = db.findByLogin(login);
    if (user == null || !db.bcrypt().matches(password, user.passwordHash)) {
      rateLimiter.recordFailure(ip);
      return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
    }
    if (user.isBanned != 0) {
      rateLimiter.recordFailure(ip);
      return ResponseEntity.status(403).body(Map.of("error", "Account suspended. Contact support."));
    }
    rateLimiter.recordSuccess(ip);
    return ResponseEntity.ok(Map.of("success", true, "token", jwt.issue(user), "user", publicUser(user)));
  }

  private static String firstNonBlank(String... values) {
    if (values == null) return null;
    for (String v : values) {
      if (v != null && !v.isBlank()) return v.trim();
    }
    return null;
  }

  private static String clientIp(HttpServletRequest req) {
    String xf = req.getHeader("X-Forwarded-For");
    if (xf != null && !xf.isBlank()) return xf.split(",")[0].trim();
    return req.getRemoteAddr();
  }

  @GetMapping("/me")
  public ResponseEntity<?> me(@RequestHeader(value = "Authorization", required = false) String auth) {
    try {
      Claims claims = jwt.fromAuthHeader(auth);
      long id = ((Number) claims.get("id")).longValue();
      User user = db.findById(id);
      if (user == null) return ResponseEntity.status(404).body(Map.of("error", "User not found"));
      if (user.isBanned != 0) return ResponseEntity.status(403).body(Map.of("error", "Account suspended"));
      Map<String, Object> u = publicUser(user);
      u.put("created_at", user.createdAt);
      return ResponseEntity.ok(Map.of("user", u));
    } catch (Exception e) {
      return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
    }
  }

  private Map<String, Object> publicUser(User user) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", user.id);
    m.put("username", user.username);
    m.put("email", user.email);
    m.put("balance", user.balance);
    m.put("role", user.role);
    return m;
  }
}
