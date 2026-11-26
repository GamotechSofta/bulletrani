package com.bulletrani.web;

import com.bulletrani.provider.ProviderWalletService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Thin REST helpers so the game UI can sync Provider wallet balance/profile
 * when launched with ?sessionToken=...
 */
@RestController
@RequestMapping("/api/provider")
public class ProviderController {
  private final ProviderWalletService provider;

  public ProviderController(ProviderWalletService provider) {
    this.provider = provider;
  }

  @GetMapping("/status")
  public Map<String, Object> status() {
    return provider.getPublicConfig();
  }

  @PostMapping("/balance")
  public ResponseEntity<?> balance(@RequestBody Map<String, String> body) {
    if (!provider.isEnabled()) {
      return ResponseEntity.badRequest().body(Map.of("error", "Provider wallet disabled"));
    }
    String token = body.get("sessionToken");
    try {
      Double bal = provider.getBalance(token);
      return ResponseEntity.ok(Map.of("success", true, "balance", bal));
    } catch (Exception e) {
      return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
    }
  }

  @PostMapping("/profile")
  public ResponseEntity<?> profile(@RequestBody Map<String, String> body) {
    if (!provider.isEnabled()) {
      return ResponseEntity.badRequest().body(Map.of("error", "Provider wallet disabled"));
    }
    try {
      return ResponseEntity.ok(Map.of("success", true, "profile", provider.getPlayerProfile(body.get("sessionToken"))));
    } catch (Exception e) {
      return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
    }
  }
}
