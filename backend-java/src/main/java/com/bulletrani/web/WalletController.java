package com.bulletrani.web;

import com.bulletrani.security.JwtService;
import com.bulletrani.store.DataStore;
import com.bulletrani.store.Models.Tx;
import com.bulletrani.store.Models.User;
import io.jsonwebtoken.Claims;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/wallet")
public class WalletController {
  private final DataStore db;
  private final JwtService jwt;

  public WalletController(DataStore db, JwtService jwt) {
    this.db = db;
    this.jwt = jwt;
  }

  private long uid(String auth) {
    Claims c = jwt.fromAuthHeader(auth);
    return ((Number) c.get("id")).longValue();
  }

  @GetMapping("/balance")
  public ResponseEntity<?> balance(@RequestHeader("Authorization") String auth) {
    try {
      User u = db.findById(uid(auth));
      if (u == null) return ResponseEntity.status(404).body(Map.of("error", "User not found"));
      return ResponseEntity.ok(Map.of("balance", u.balance));
    } catch (Exception e) {
      return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
    }
  }

  /**
   * Self-serve deposit is disabled — it previously credited balance with no payment.
   * Credits must come from admin adjust-balance or Provider wallet.
   */
  @PostMapping("/deposit")
  public ResponseEntity<?> deposit(@RequestHeader(value = "Authorization", required = false) String auth,
                                   @RequestBody(required = false) Map<String, Object> body) {
    return ResponseEntity.status(403).body(Map.of(
        "success", false,
        "error", "Self-serve deposits are disabled. Use Provider wallet or contact support."
    ));
  }

  /**
   * Self-serve withdraw is disabled — it previously drained local balance with no payout rail.
   * Cash-outs must go through Provider wallet or admin-controlled flows.
   */
  @PostMapping("/withdraw")
  public ResponseEntity<?> withdraw(@RequestHeader(value = "Authorization", required = false) String auth,
                                    @RequestBody(required = false) Map<String, Object> body) {
    return ResponseEntity.status(403).body(Map.of(
        "success", false,
        "error", "Self-serve withdrawals are disabled. Use Provider wallet or contact support."
    ));
  }

  @GetMapping("/transactions")
  public ResponseEntity<?> transactions(@RequestHeader("Authorization") String auth) {
    try {
      List<Tx> txs = db.userTransactions(uid(auth));
      return ResponseEntity.ok(Map.of("transactions", txs));
    } catch (Exception e) {
      return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
    }
  }
}
