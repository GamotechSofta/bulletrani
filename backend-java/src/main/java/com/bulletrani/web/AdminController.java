package com.bulletrani.web;

import com.bulletrani.engine.CrashEngine;
import com.bulletrani.engine.GameBroadcaster;
import com.bulletrani.provider.ProviderWalletService;
import com.bulletrani.security.JwtService;
import com.bulletrani.store.DataStore;
import com.bulletrani.store.Models.User;
import io.jsonwebtoken.Claims;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
  private final DataStore db;
  private final JwtService jwt;
  private final CrashEngine engine;
  private final ProviderWalletService provider;
  private final GameBroadcaster bus;

  public AdminController(
      DataStore db,
      JwtService jwt,
      CrashEngine engine,
      ProviderWalletService provider,
      GameBroadcaster bus) {
    this.db = db;
    this.jwt = jwt;
    this.engine = engine;
    this.provider = provider;
    this.bus = bus;
  }

  /** Live role check from DB — demoted admins lose access even with an old JWT. */
  private Claims requireAdmin(String auth) {
    Claims c = jwt.fromAuthHeader(auth);
    long id = ((Number) c.get("id")).longValue();
    User u = db.findById(id);
    if (u == null || u.isBanned != 0 || !"admin".equals(u.role)) {
      throw new SecurityException("Admin privilege required");
    }
    return c;
  }

  private ResponseEntity<?> deny(Exception e) {
    if (e instanceof SecurityException) return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
    return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
  }

  @GetMapping("/stats")
  public ResponseEntity<?> stats(@RequestHeader("Authorization") String auth) {
    try {
      requireAdmin(auth);
      double volume = db.sumVolumeReal();
      double payout = db.sumPayoutsReal();
      double ggr = DataStore.round2(volume - payout);
      double rtp = volume > 0 ? DataStore.round2((payout / volume) * 100) : 0;
      Map<String, Object> m = new LinkedHashMap<>();
      m.put("totalUsers", db.countPlayers());
      m.put("totalVolume", volume);
      m.put("totalPayout", payout);
      m.put("grossGamingRevenue", ggr);
      m.put("actualRTP", rtp);
      m.put("configuredHouseEdge", db.getSetting("house_edge", "3.0"));
      m.put("totalRounds", db.countCompletedRounds());
      return ResponseEntity.ok(m);
    } catch (Exception e) { return deny(e); }
  }

  @GetMapping("/engine")
  public ResponseEntity<?> engine(@RequestHeader("Authorization") String auth) {
    try {
      requireAdmin(auth);
      return ResponseEntity.ok(Map.of("success", true, "engine", engine.getAdminEngineState()));
    } catch (Exception e) { return deny(e); }
  }

  @GetMapping("/users")
  public ResponseEntity<?> users(@RequestHeader("Authorization") String auth) {
    try {
      requireAdmin(auth);
      List<Map<String, Object>> users = db.listUsers().stream().map(u -> {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.id); m.put("username", u.username); m.put("email", u.email);
        m.put("balance", u.balance); m.put("role", u.role); m.put("is_banned", u.isBanned);
        m.put("created_at", u.createdAt);
        return m;
      }).collect(Collectors.toList());
      return ResponseEntity.ok(Map.of("users", users));
    } catch (Exception e) { return deny(e); }
  }

  @PostMapping("/create-user")
  public ResponseEntity<?> createUser(@RequestHeader("Authorization") String auth, @RequestBody Map<String, Object> body) {
    try {
      requireAdmin(auth);
      String username = String.valueOf(body.get("username"));
      String email = String.valueOf(body.get("email"));
      String password = String.valueOf(body.get("password"));
      String role = "admin".equals(body.get("role")) ? "admin" : "player";
      double balance = body.get("balance") == null ? 5000 : Double.parseDouble(String.valueOf(body.get("balance")));
      if (db.existsUsernameOrEmail(username, email)) {
        return ResponseEntity.badRequest().body(Map.of("error", "Username or email already in use"));
      }
      User u = db.createUser(username, email, password, balance, role);
      Map<String, Object> user = new LinkedHashMap<>();
      user.put("id", u.id); user.put("username", u.username); user.put("email", u.email);
      user.put("balance", u.balance); user.put("role", u.role);
      return ResponseEntity.ok(Map.of("success", true, "user", user));
    } catch (Exception e) { return deny(e); }
  }

  @PostMapping("/set-role")
  public ResponseEntity<?> setRole(@RequestHeader("Authorization") String auth, @RequestBody Map<String, Object> body) {
    try {
      Claims admin = requireAdmin(auth);
      long userId = Long.parseLong(String.valueOf(body.get("userId")));
      String role = String.valueOf(body.get("role"));
      if (!List.of("admin", "player").contains(role)) {
        return ResponseEntity.badRequest().body(Map.of("error", "Role must be admin or player"));
      }
      if (userId == ((Number) admin.get("id")).longValue() && !"admin".equals(role)) {
        return ResponseEntity.badRequest().body(Map.of("error", "Cannot demote your own admin account"));
      }
      if (db.findById(userId) == null) return ResponseEntity.status(404).body(Map.of("error", "User not found"));
      db.setRole(userId, role);
      return ResponseEntity.ok(Map.of("success", true, "role", role));
    } catch (Exception e) { return deny(e); }
  }

  @PostMapping("/reset-password")
  public ResponseEntity<?> resetPassword(@RequestHeader("Authorization") String auth, @RequestBody Map<String, Object> body) {
    try {
      requireAdmin(auth);
      long userId = Long.parseLong(String.valueOf(body.get("userId")));
      String pw = String.valueOf(body.get("newPassword"));
      if (pw.length() < 8) return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 8 characters"));
      if (db.findById(userId) == null) return ResponseEntity.status(404).body(Map.of("error", "User not found"));
      db.setPassword(userId, pw);
      return ResponseEntity.ok(Map.of("success", true, "message", "Password reset"));
    } catch (Exception e) { return deny(e); }
  }

  @PostMapping("/adjust-balance")
  public ResponseEntity<?> adjustBalance(@RequestHeader("Authorization") String auth, @RequestBody Map<String, Object> body) {
    try {
      requireAdmin(auth);
      long userId = Long.parseLong(String.valueOf(body.get("userId")));
      double change = Double.parseDouble(String.valueOf(body.get("amount")));
      String reason = String.valueOf(body.getOrDefault("reason", "Admin Manual Adjustment"));
      User u = db.findById(userId);
      if (u == null) return ResponseEntity.status(404).body(Map.of("error", "User not found"));
      double newBal = Math.max(0, DataStore.round2(u.balance + change));
      db.updateBalance(userId, newBal);
      db.insertTx(userId, "admin_adj", change, newBal, reason);
      bus.emitToUser(userId, "wallet:updated", Map.of("balance", newBal));
      return ResponseEntity.ok(Map.of("success", true, "newBalance", newBal));
    } catch (Exception e) { return deny(e); }
  }

  @PostMapping("/toggle-ban")
  public ResponseEntity<?> toggleBan(@RequestHeader("Authorization") String auth, @RequestBody Map<String, Object> body) {
    try {
      Claims admin = requireAdmin(auth);
      long userId = Long.parseLong(String.valueOf(body.get("userId")));
      if (userId == ((Number) admin.get("id")).longValue()) {
        return ResponseEntity.badRequest().body(Map.of("error", "Cannot ban your own admin account"));
      }
      User u = db.findById(userId);
      if (u == null) return ResponseEntity.status(404).body(Map.of("error", "User not found"));
      int next = u.isBanned != 0 ? 0 : 1;
      db.setBanned(userId, next);
      return ResponseEntity.ok(Map.of("success", true, "is_banned", next));
    } catch (Exception e) { return deny(e); }
  }

  @GetMapping("/settings")
  public ResponseEntity<?> getSettings(@RequestHeader("Authorization") String auth) {
    try {
      requireAdmin(auth);
      return ResponseEntity.ok(Map.of("settings", db.allSettings()));
    } catch (Exception e) { return deny(e); }
  }

  @PostMapping("/settings")
  public ResponseEntity<?> saveSettings(@RequestHeader("Authorization") String auth, @RequestBody Map<String, Object> body) {
    try {
      requireAdmin(auth);
      db.putSettings(body);
      return ResponseEntity.ok(Map.of("success", true, "message", "Settings saved"));
    } catch (Exception e) { return deny(e); }
  }

  @GetMapping("/transactions")
  public ResponseEntity<?> transactions(@RequestHeader("Authorization") String auth,
                                        @RequestParam(defaultValue = "100") int limit) {
    try {
      requireAdmin(auth);
      return ResponseEntity.ok(Map.of("transactions", db.listTransactions(Math.min(limit, 200))));
    } catch (Exception e) { return deny(e); }
  }

  @PostMapping("/force-crash")
  public ResponseEntity<?> forceCrash(@RequestHeader("Authorization") String auth, @RequestBody(required = false) Map<String, Object> body) {
    try {
      requireAdmin(auth);
      Double at = body != null && body.get("atMultiplier") != null ? Double.parseDouble(String.valueOf(body.get("atMultiplier"))) : null;
      Map<String, Object> r = engine.forceCrash(at);
      return Boolean.TRUE.equals(r.get("success")) ? ResponseEntity.ok(r) : ResponseEntity.badRequest().body(r);
    } catch (Exception e) { return deny(e); }
  }

  @PostMapping("/force-start")
  public ResponseEntity<?> forceStart(@RequestHeader("Authorization") String auth) {
    try {
      requireAdmin(auth);
      Map<String, Object> r = engine.forceStart();
      return Boolean.TRUE.equals(r.get("success")) ? ResponseEntity.ok(r) : ResponseEntity.badRequest().body(r);
    } catch (Exception e) { return deny(e); }
  }

  @PostMapping("/pause")
  public ResponseEntity<?> pause(@RequestHeader("Authorization") String auth) {
    try { requireAdmin(auth); return ResponseEntity.ok(engine.pauseGame()); }
    catch (Exception e) { return deny(e); }
  }

  @PostMapping("/resume")
  public ResponseEntity<?> resume(@RequestHeader("Authorization") String auth) {
    try { requireAdmin(auth); return ResponseEntity.ok(engine.resumeGame()); }
    catch (Exception e) { return deny(e); }
  }

  @PostMapping("/set-next-crash")
  public ResponseEntity<?> setNext(@RequestHeader("Authorization") String auth, @RequestBody Map<String, Object> body) {
    try {
      requireAdmin(auth);
      Map<String, Object> r = engine.setNextCrashOverride(Double.parseDouble(String.valueOf(body.get("multiplier"))));
      return Boolean.TRUE.equals(r.get("success")) ? ResponseEntity.ok(r) : ResponseEntity.badRequest().body(r);
    } catch (Exception e) { return deny(e); }
  }

  @PostMapping("/set-crash-target")
  public ResponseEntity<?> setTarget(@RequestHeader("Authorization") String auth, @RequestBody Map<String, Object> body) {
    try {
      requireAdmin(auth);
      Map<String, Object> r = engine.setCurrentCrashTarget(Double.parseDouble(String.valueOf(body.get("multiplier"))));
      return Boolean.TRUE.equals(r.get("success")) ? ResponseEntity.ok(r) : ResponseEntity.badRequest().body(r);
    } catch (Exception e) { return deny(e); }
  }

  @PostMapping("/clear-overrides")
  public ResponseEntity<?> clear(@RequestHeader("Authorization") String auth) {
    try { requireAdmin(auth); return ResponseEntity.ok(engine.clearCrashOverrides()); }
    catch (Exception e) { return deny(e); }
  }

  @GetMapping("/provider")
  public ResponseEntity<?> getProvider(@RequestHeader("Authorization") String auth) {
    try {
      requireAdmin(auth);
      return ResponseEntity.ok(Map.of("success", true, "provider", provider.getPublicConfig()));
    } catch (Exception e) { return deny(e); }
  }

  /**
   * List integrated wallet sources (local + configured providers) with volume / payout / GGR.
   */
  @GetMapping("/providers")
  public ResponseEntity<?> listProviders(@RequestHeader("Authorization") String auth) {
    try {
      requireAdmin(auth);
      Map<String, Map<String, Double>> finance = db.sumFinanceByWalletSource();
      List<Map<String, Object>> providers = new ArrayList<>();

      Map<String, Double> localFin = finance.getOrDefault("local", Map.of(
          "volume", 0.0, "payout", 0.0, "ggr", 0.0, "rtp", 0.0, "bets", 0.0, "wins", 0.0));
      Map<String, Object> local = new LinkedHashMap<>();
      local.put("id", "local");
      local.put("name", "Local Wallet");
      local.put("type", "local");
      local.put("status", "active");
      local.put("gameCode", null);
      local.put("apiUrl", null);
      local.put("totalVolume", localFin.getOrDefault("volume", 0.0));
      local.put("totalPayout", localFin.getOrDefault("payout", 0.0));
      local.put("grossGamingRevenue", localFin.getOrDefault("ggr", 0.0));
      local.put("actualRTP", localFin.getOrDefault("rtp", 0.0));
      local.put("betCount", localFin.getOrDefault("bets", 0.0).longValue());
      local.put("winCount", localFin.getOrDefault("wins", 0.0).longValue());
      providers.add(local);

      Map<String, Object> cfg = provider.getPublicConfig();
      String pid = String.valueOf(cfg.getOrDefault("id", "provider"));
      Map<String, Double> pFin = finance.getOrDefault(pid, Map.of(
          "volume", 0.0, "payout", 0.0, "ggr", 0.0, "rtp", 0.0, "bets", 0.0, "wins", 0.0));
      Map<String, Object> row = new LinkedHashMap<>();
      row.put("id", pid);
      row.put("name", cfg.getOrDefault("name", pid));
      row.put("type", "provider");
      row.put("status", Boolean.TRUE.equals(cfg.get("active")) ? "active"
          : Boolean.TRUE.equals(cfg.get("enabled")) ? "configured" : "disabled");
      row.put("gameCode", cfg.get("gameCode"));
      row.put("apiUrl", cfg.get("apiUrl"));
      row.put("tableId", cfg.get("tableId"));
      row.put("totalVolume", pFin.getOrDefault("volume", 0.0));
      row.put("totalPayout", pFin.getOrDefault("payout", 0.0));
      row.put("grossGamingRevenue", pFin.getOrDefault("ggr", 0.0));
      row.put("actualRTP", pFin.getOrDefault("rtp", 0.0));
      row.put("betCount", pFin.getOrDefault("bets", 0.0).longValue());
      row.put("winCount", pFin.getOrDefault("wins", 0.0).longValue());
      providers.add(row);

      // Any historical wallet_source keys not already listed
      for (Map.Entry<String, Map<String, Double>> e : finance.entrySet()) {
        String key = e.getKey();
        if ("local".equals(key) || pid.equals(key)) continue;
        Map<String, Double> fin = e.getValue();
        Map<String, Object> extra = new LinkedHashMap<>();
        extra.put("id", key);
        extra.put("name", key);
        extra.put("type", "provider");
        extra.put("status", "historical");
        extra.put("gameCode", null);
        extra.put("apiUrl", null);
        extra.put("totalVolume", fin.getOrDefault("volume", 0.0));
        extra.put("totalPayout", fin.getOrDefault("payout", 0.0));
        extra.put("grossGamingRevenue", fin.getOrDefault("ggr", 0.0));
        extra.put("actualRTP", fin.getOrDefault("rtp", 0.0));
        extra.put("betCount", fin.getOrDefault("bets", 0.0).longValue());
        extra.put("winCount", fin.getOrDefault("wins", 0.0).longValue());
        providers.add(extra);
      }

      double grossAll = providers.stream()
          .mapToDouble(p -> ((Number) p.getOrDefault("grossGamingRevenue", 0)).doubleValue())
          .sum();
      double volumeAll = providers.stream()
          .mapToDouble(p -> ((Number) p.getOrDefault("totalVolume", 0)).doubleValue())
          .sum();
      double payoutAll = providers.stream()
          .mapToDouble(p -> ((Number) p.getOrDefault("totalPayout", 0)).doubleValue())
          .sum();

      Map<String, Object> totals = new LinkedHashMap<>();
      totals.put("totalVolume", DataStore.round2(volumeAll));
      totals.put("totalPayout", DataStore.round2(payoutAll));
      totals.put("grossGamingRevenue", DataStore.round2(grossAll));
      totals.put("actualRTP", volumeAll > 0 ? DataStore.round2((payoutAll / volumeAll) * 100) : 0);

      Map<String, Object> out = new LinkedHashMap<>();
      out.put("success", true);
      out.put("providers", providers);
      out.put("totals", totals);
      return ResponseEntity.ok(out);
    } catch (Exception e) { return deny(e); }
  }

  @PutMapping("/provider")
  public ResponseEntity<?> saveProvider(@RequestHeader("Authorization") String auth,
                                        @RequestBody Map<String, Object> body) {
    try {
      requireAdmin(auth);
      Map<String, Object> cfg = provider.updateConfig(body);
      return ResponseEntity.ok(Map.of(
          "success", true,
          "message", "Provider settings saved",
          "provider", cfg
      ));
    } catch (Exception e) { return deny(e); }
  }

  /** Support: look up player profile for a live sessionToken via Provider wallet API. */
  @PostMapping("/provider/session-lookup")
  public ResponseEntity<?> providerSessionLookup(@RequestHeader("Authorization") String auth,
                                                 @RequestBody Map<String, String> body) {
    try {
      requireAdmin(auth);
      if (!provider.isEnabled()) {
        return ResponseEntity.badRequest().body(Map.of(
            "success", false,
            "error", "Provider wallet is disabled — enable it first"
        ));
      }
      String token = body.get("sessionToken");
      if (token == null || token.isBlank()) {
        return ResponseEntity.badRequest().body(Map.of("success", false, "error", "sessionToken required"));
      }
      Double balance = provider.getBalance(token);
      Map<String, Object> profile = provider.getPlayerProfile(token);
      Map<String, Object> out = new LinkedHashMap<>();
      out.put("success", true);
      out.put("balance", balance);
      out.put("profile", profile);
      return ResponseEntity.ok(out);
    } catch (Exception e) {
      return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
    }
  }
}
