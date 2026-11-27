package com.bulletrani.web;

import com.bulletrani.operations.OperationsLaunchService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Browser-facing Launch &amp; Boot and balance refresh endpoints for Operations 302 redirects.
 * X-Internal-Key and server-to-server operations URLs are never returned here.
 */
@RestController
@RequestMapping("/api/operations")
public class OperationsController {
  private final OperationsLaunchService operations;

  public OperationsController(OperationsLaunchService operations) {
    this.operations = operations;
  }

  @GetMapping("/config")
  public Map<String, Object> config() {
    return operations.getClientBootConfig();
  }

  @PostMapping("/boot")
  public ResponseEntity<?> boot(@RequestBody(required = false) Map<String, Object> body) {
    Map<String, Object> result = operations.bootSession(body, false);
    if (!Boolean.TRUE.equals(result.get("success"))) {
      return ResponseEntity.badRequest().body(result);
    }
    return ResponseEntity.ok(result);
  }

  /**
   * Refreshes the player's authoritative 2051 balance server-to-server from a booted token.
   * Browser never calls /api/v1/wallet/* directly.
   */
  @PostMapping("/balance")
  public ResponseEntity<?> balance(@RequestBody(required = false) Map<String, String> body) {
    String token = body == null ? null : body.get("token");
    Map<String, Object> session = operations.getSessionByToken(token);
    if (session == null) {
      return ResponseEntity.status(401).body(Map.of("success", false, "error", "Invalid or unbooted operations session"));
    }
    String partnerCode = String.valueOf(session.getOrDefault("partnerCode", ""));
    Map<String, Object> balRes = operations.fetchBalance2051(token, partnerCode);
    if (!Boolean.TRUE.equals(balRes.get("success"))) {
      return ResponseEntity.badRequest().body(Map.of("success", false, "error", balRes.get("message")));
    }
    return ResponseEntity.ok(Map.of("success", true, "balance", balRes.get("balance")));
  }
}
