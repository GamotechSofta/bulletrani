package com.bulletrani.web;

import com.bulletrani.fair.ProvablyFair;
import com.bulletrani.security.JwtService;
import com.bulletrani.store.DataStore;
import com.bulletrani.store.Models.GameRound;
import io.jsonwebtoken.Claims;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/game")
public class GameController {
  private final DataStore db;
  private final JwtService jwt;

  public GameController(DataStore db, JwtService jwt) {
    this.db = db;
    this.jwt = jwt;
  }

  @PostMapping("/verify")
  public ResponseEntity<?> verify(@RequestBody Map<String, Object> body) {
    String serverSeed = body.get("serverSeed") == null ? null : String.valueOf(body.get("serverSeed"));
    String clientSeed = body.get("clientSeed") == null ? null : String.valueOf(body.get("clientSeed"));
    if (serverSeed == null || clientSeed == null) {
      return ResponseEntity.badRequest().body(Map.of("error", "serverSeed and clientSeed are required"));
    }
    double houseEdge = body.get("houseEdge") == null ? 3.0 : Double.parseDouble(String.valueOf(body.get("houseEdge")));
    long nonce = body.get("nonce") == null ? 0 : Long.parseLong(String.valueOf(body.get("nonce")));
    String seedHash = body.get("seedHash") == null ? null : String.valueOf(body.get("seedHash"));
    if ("null".equals(seedHash) || (seedHash != null && seedHash.isBlank())) seedHash = null;

    Map<String, Object> verification = ProvablyFair.verifyRound(serverSeed, clientSeed, houseEdge, nonce, seedHash);

    Object prev = body.get("prevChainHash");
    Object chain = body.get("chainHash");
    if (prev != null && chain != null && !"null".equals(String.valueOf(prev))) {
      verification.put("chain", ProvablyFair.verifyChainLink(
          String.valueOf(prev),
          String.valueOf(verification.get("publicHash")),
          nonce,
          String.valueOf(chain)
      ));
    } else {
      verification.put("chain", null);
    }
    return ResponseEntity.ok(Map.of("success", true, "verification", verification));
  }

  @GetMapping("/history")
  public Map<String, Object> history(@RequestParam(defaultValue = "30") int limit) {
    limit = Math.min(limit, 100);
    List<GameRound> rows = db.recentCompleted(limit);
    return Map.of("history", rows);
  }

  @GetMapping("/leaderboard")
  public Map<String, Object> leaderboard() {
    return Map.of("topWins", db.topWins());
  }

  /** Authenticated — returns bets for the JWT subject only (no path userId). */
  @GetMapping("/my-bets")
  public ResponseEntity<?> myBets(@RequestHeader("Authorization") String auth) {
    try {
      Claims c = jwt.fromAuthHeader(auth);
      long userId = ((Number) c.get("id")).longValue();
      return ResponseEntity.ok(Map.of("bets", db.userBets(userId)));
    } catch (Exception e) {
      return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
    }
  }

  /** Legacy path — still requires JWT and only allows own userId. */
  @GetMapping("/my-bets/{userId}")
  public ResponseEntity<?> myBetsById(@RequestHeader("Authorization") String auth,
                                      @PathVariable long userId) {
    try {
      Claims c = jwt.fromAuthHeader(auth);
      long authed = ((Number) c.get("id")).longValue();
      if (authed != userId) {
        return ResponseEntity.status(403).body(Map.of("error", "Forbidden"));
      }
      return ResponseEntity.ok(Map.of("bets", db.userBets(userId)));
    } catch (Exception e) {
      return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
    }
  }
}
