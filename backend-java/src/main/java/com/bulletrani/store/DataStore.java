package com.bulletrani.store;

import com.bulletrani.config.AppProperties;
import com.bulletrani.store.Models.*;
import jakarta.annotation.PostConstruct;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * MongoDB-backed game store. Replaces the legacy backend/data/store.json file.
 */
@Component
public class DataStore {
  private final MongoTemplate mongo;
  private final BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder(10);
  private final String databaseName;

  public DataStore(MongoTemplate mongo, AppProperties props) {
    this.mongo = mongo;
    this.databaseName = props.getMongodb().getDatabase() == null || props.getMongodb().getDatabase().isBlank()
        ? "bullet_rani"
        : props.getMongodb().getDatabase();
  }

  @PostConstruct
  public void init() {
    String uri = System.getProperty("MONGODB_URI", System.getenv("MONGODB_URI"));
    if (uri == null || uri.isBlank()) {
      throw new IllegalStateException(
          "MONGODB_URI is required. Set it in backend-java/.env — JSON store.json is no longer used.");
    }
    seedDefaults();
    System.out.println("📦 MongoDB store ready — database `" + databaseName + "` (store.json disabled)");
  }

  private void seedDefaults() {
    putSettingIfAbsent("house_edge", "3.0");
    putSettingIfAbsent("min_bet", "10.0");
    putSettingIfAbsent("max_bet", "10000.0");
    putSettingIfAbsent("max_payout", "1000000.0");
    putSettingIfAbsent("max_crash_multiplier", "20.0");
    putSettingIfAbsent("max_round_stake", "0");
    putSettingIfAbsent("countdown_seconds", "5.0");
    putSettingIfAbsent("currency_symbol", "₹");

    ensureCounter("users", 0);
    ensureCounter("game_rounds", 0);
    ensureCounter("bets", 0);
    ensureCounter("transactions", 0);

    String adminPassword = firstEnv("ADMIN_PASSWORD");
    if (adminPassword == null || adminPassword.isBlank()) {
      throw new IllegalStateException("ADMIN_PASSWORD is required in backend-java/.env");
    }
    // Always sync admin password from env so rotations take effect on restart
    ensureSeedAdmin("admin", "admin@bulletrani.local", adminPassword);

    if (mongo.count(Query.query(Criteria.where("role").is("player")), User.class) == 0) {
      createUserInternal("TopGunPilot", "pilot@aviator.local", "pilot123", 0, "player");
      createUserInternal("LuckySky77", "sky77@aviator.local", "pilot123", 0, "player");
    }
  }

  private static String firstEnv(String key) {
    String v = System.getProperty(key);
    if (v == null || v.isBlank()) v = System.getenv(key);
    return v;
  }

  private void putSettingIfAbsent(String key, String value) {
    if (mongo.findById(key, Setting.class) == null) {
      Setting s = new Setting();
      s.key = key;
      s.value = value;
      mongo.save(s);
    }
  }

  private void ensureCounter(String key, long start) {
    if (mongo.findById(key, Counter.class) == null) {
      Counter c = new Counter();
      c.id = key;
      c.seq = start;
      mongo.save(c);
    }
  }

  private void ensureSeedAdmin(String username, String email, String password) {
    User existing = mongo.findOne(
        Query.query(new Criteria().orOperator(
            Criteria.where("username").regex("^" + username + "$", "i"),
            Criteria.where("email").regex("^" + email + "$", "i")
        )),
        User.class);

    if (existing == null) {
      existing = mongo.findOne(
          Query.query(new Criteria().andOperator(
              Criteria.where("role").is("admin"),
              new Criteria().orOperator(
                  Criteria.where("username").regex("^SuperAdmin$", "i"),
                  Criteria.where("email").is("admin@aviator.local")
              )
          )),
          User.class);
    }

    if (existing == null) {
      createUserInternal(username, email, password, 0, "admin");
      return;
    }

    existing.username = username;
    existing.email = email.toLowerCase(Locale.ROOT);
    existing.role = "admin";
    existing.isBanned = 0;
    existing.passwordHash = bcrypt.encode(password);
    mongo.save(existing);
  }

  public BCryptPasswordEncoder bcrypt() { return bcrypt; }

  public synchronized User findByLogin(String login) {
    String q = login.trim();
    return mongo.findOne(
        Query.query(new Criteria().orOperator(
            Criteria.where("username").regex("^" + java.util.regex.Pattern.quote(q) + "$", "i"),
            Criteria.where("email").regex("^" + java.util.regex.Pattern.quote(q.toLowerCase(Locale.ROOT)) + "$", "i")
        )),
        User.class);
  }

  public synchronized User findById(long id) {
    return mongo.findById(id, User.class);
  }

  public synchronized boolean existsUsernameOrEmail(String username, String email) {
    return mongo.exists(
        Query.query(new Criteria().orOperator(
            Criteria.where("username").regex("^" + java.util.regex.Pattern.quote(username) + "$", "i"),
            Criteria.where("email").regex("^" + java.util.regex.Pattern.quote(email) + "$", "i")
        )),
        User.class);
  }

  public synchronized User createUser(String username, String email, String password, double balance, String role) {
    return createUserInternal(username, email, password, balance, role);
  }

  private User createUserInternal(String username, String email, String password, double balance, String role) {
    User u = new User();
    u.id = next("users");
    u.username = username.trim();
    u.email = email.trim().toLowerCase(Locale.ROOT);
    u.passwordHash = bcrypt.encode(password);
    u.balance = balance;
    u.role = role;
    u.isBanned = 0;
    u.createdAt = Instant.now().toString();
    return mongo.save(u);
  }

  public synchronized void updateBalance(long userId, double balance) {
    mongo.updateFirst(
        Query.query(Criteria.where("_id").is(userId)),
        Update.update("balance", round2(balance)),
        User.class);
  }

  public synchronized void setBanned(long userId, int banned) {
    mongo.updateFirst(
        Query.query(Criteria.where("_id").is(userId)),
        Update.update("is_banned", banned),
        User.class);
  }

  public synchronized void setRole(long userId, String role) {
    mongo.updateFirst(
        Query.query(Criteria.where("_id").is(userId)),
        Update.update("role", role),
        User.class);
  }

  public synchronized void setPassword(long userId, String raw) {
    mongo.updateFirst(
        Query.query(Criteria.where("_id").is(userId)),
        Update.update("password_hash", bcrypt.encode(raw)),
        User.class);
  }

  public synchronized List<User> listUsers() {
    List<User> users = mongo.find(new Query().with(Sort.by(Sort.Direction.DESC, "_id")), User.class);
    return users;
  }

  public synchronized long countPlayers() {
    return mongo.count(Query.query(Criteria.where("role").is("player")), User.class);
  }

  public synchronized String getSetting(String key, String fallback) {
    Setting s = mongo.findById(key, Setting.class);
    return s != null && s.value != null ? s.value : fallback;
  }

  public synchronized double getSettingDouble(String key, double fallback) {
    try { return Double.parseDouble(getSetting(key, String.valueOf(fallback))); }
    catch (Exception e) { return fallback; }
  }

  public synchronized Map<String, String> allSettings() {
    Map<String, String> map = new LinkedHashMap<>();
    for (Setting s : mongo.findAll(Setting.class)) {
      map.put(s.key, s.value);
    }
    return map;
  }

  public synchronized void putSettings(Map<String, ?> updates) {
    updates.forEach((k, v) -> {
      Setting s = new Setting();
      s.key = k;
      s.value = String.valueOf(v);
      mongo.save(s);
    });
  }

  public synchronized long maxRoundNumber() {
    GameRound r = mongo.findOne(
        new Query().with(Sort.by(Sort.Direction.DESC, "round_number")).limit(1),
        GameRound.class);
    return r != null ? r.roundNumber : 1000;
  }

  public synchronized GameRound insertRound(long roundNumber, String serverSeed, String clientSeed,
                                            String hash, String seedHash, long nonce, String chainHash,
                                            double crashMultiplier) {
    GameRound r = new GameRound();
    r.id = next("game_rounds");
    r.roundNumber = roundNumber;
    r.serverSeed = serverSeed;
    r.clientSeed = clientSeed;
    r.hash = hash;
    r.seedHash = seedHash;
    r.nonce = nonce;
    r.chainHash = chainHash;
    r.crashMultiplier = crashMultiplier;
    r.status = "waiting";
    r.startedAt = Instant.now().toString();
    return mongo.save(r);
  }

  public synchronized void setRoundInProgress(long id) {
    mongo.updateFirst(
        Query.query(Criteria.where("_id").is(id)),
        Update.update("status", "in_progress"),
        GameRound.class);
  }

  public synchronized void completeRound(long id, double crashMultiplier) {
    mongo.updateFirst(
        Query.query(Criteria.where("_id").is(id)),
        new Update()
            .set("status", "completed")
            .set("crash_multiplier", crashMultiplier)
            .set("crashed_at", Instant.now().toString()),
        GameRound.class);
  }

  public synchronized void updateRoundCrashMultiplier(long id, double crashMultiplier) {
    mongo.updateFirst(
        Query.query(Criteria.where("_id").is(id)),
        Update.update("crash_multiplier", round2(crashMultiplier)),
        GameRound.class);
  }

  public synchronized List<GameRound> recentCompleted(int limit) {
    return mongo.find(
        Query.query(Criteria.where("status").is("completed"))
            .with(Sort.by(Sort.Direction.DESC, "round_number"))
            .limit(limit),
        GameRound.class);
  }

  public synchronized String lastChainHash() {
    GameRound r = mongo.findOne(
        Query.query(Criteria.where("status").is("completed").and("chain_hash").ne(null))
            .with(Sort.by(Sort.Direction.DESC, "_id"))
            .limit(1),
        GameRound.class);
    return r != null && r.chainHash != null ? r.chainHash : "GENESIS";
  }

  public synchronized Bet insertBet(long roundId, long userId, int panelId, double amount, Double autoCashout) {
    return insertBet(roundId, userId, panelId, amount, autoCashout, "local", null);
  }

  public synchronized Bet insertBet(long roundId, long userId, int panelId, double amount, Double autoCashout,
                                    String walletSource, String providerCode) {
    Bet b = new Bet();
    b.id = next("bets");
    b.roundId = roundId;
    b.userId = userId;
    b.panelId = panelId;
    b.betAmount = amount;
    b.autoCashout = autoCashout;
    b.cashoutMultiplier = null;
    b.winAmount = 0;
    b.status = "active";
    b.walletSource = walletSource == null || walletSource.isBlank() ? "local" : walletSource.trim();
    b.providerCode = providerCode;
    b.createdAt = Instant.now().toString();
    return mongo.save(b);
  }

  /** Per wallet_source volume / payout / GGR for real players (user_id > 0). */
  public synchronized Map<String, Map<String, Double>> sumFinanceByWalletSource() {
    List<Bet> bets = mongo.find(
        Query.query(Criteria.where("user_id").gt(0).and("status").ne("cancelled")),
        Bet.class);
    Map<String, Map<String, Double>> out = new LinkedHashMap<>();
    for (Bet b : bets) {
      String src = (b.walletSource == null || b.walletSource.isBlank()) ? "local" : b.walletSource;
      Map<String, Double> row = out.computeIfAbsent(src, k -> {
        Map<String, Double> m = new LinkedHashMap<>();
        m.put("volume", 0.0);
        m.put("payout", 0.0);
        m.put("bets", 0.0);
        m.put("wins", 0.0);
        return m;
      });
      row.put("volume", row.get("volume") + b.betAmount);
      row.put("bets", row.get("bets") + 1);
      if ("cashed_out".equals(b.status)) {
        row.put("payout", row.get("payout") + b.winAmount);
        row.put("wins", row.get("wins") + 1);
      }
    }
    for (Map<String, Double> row : out.values()) {
      row.put("volume", round2(row.get("volume")));
      row.put("payout", round2(row.get("payout")));
      row.put("ggr", round2(row.get("volume") - row.get("payout")));
      double vol = row.get("volume");
      row.put("rtp", vol > 0 ? round2((row.get("payout") / vol) * 100) : 0.0);
    }
    return out;
  }

  public synchronized void cashoutBetDb(long betId, double mult, double win) {
    mongo.updateFirst(
        Query.query(Criteria.where("_id").is(betId)),
        new Update()
            .set("status", "cashed_out")
            .set("cashout_multiplier", mult)
            .set("win_amount", win),
        Bet.class);
  }

  public synchronized void markBet(long betId, String status) {
    mongo.updateFirst(
        Query.query(Criteria.where("_id").is(betId)),
        Update.update("status", status),
        Bet.class);
  }

  public synchronized double sumVolumeReal() {
    List<Bet> bets = mongo.find(
        Query.query(Criteria.where("user_id").gt(0).and("status").ne("cancelled")),
        Bet.class);
    return round2(bets.stream().mapToDouble(b -> b.betAmount).sum());
  }

  public synchronized double sumPayoutsReal() {
    List<Bet> bets = mongo.find(
        Query.query(Criteria.where("user_id").gt(0).and("status").is("cashed_out")),
        Bet.class);
    return round2(bets.stream().mapToDouble(b -> b.winAmount).sum());
  }

  public synchronized long countCompletedRounds() {
    return mongo.count(Query.query(Criteria.where("status").is("completed")), GameRound.class);
  }

  public synchronized Tx insertTx(long userId, String type, double amount, double balanceAfter, String description) {
    Tx t = new Tx();
    t.id = next("transactions");
    t.userId = userId;
    t.type = type;
    t.amount = amount;
    t.balanceAfter = balanceAfter;
    t.description = description;
    t.createdAt = Instant.now().toString();
    return mongo.save(t);
  }

  public synchronized List<Map<String, Object>> listTransactions(int limit) {
    List<Tx> txs = mongo.find(
        new Query().with(Sort.by(Sort.Direction.DESC, "_id")).limit(limit),
        Tx.class);
    return txs.stream().map(t -> {
      User u = findById(t.userId);
      Map<String, Object> m = new LinkedHashMap<>();
      m.put("id", t.id);
      m.put("user_id", t.userId);
      m.put("username", u != null ? u.username : "Unknown");
      m.put("type", t.type);
      m.put("amount", t.amount);
      m.put("balance_after", t.balanceAfter);
      m.put("description", t.description);
      m.put("created_at", t.createdAt);
      return m;
    }).collect(Collectors.toList());
  }

  public synchronized List<Tx> userTransactions(long userId) {
    return mongo.find(
        Query.query(Criteria.where("user_id").is(userId))
            .with(Sort.by(Sort.Direction.DESC, "_id"))
            .limit(50),
        Tx.class);
  }

  public synchronized List<Map<String, Object>> topWins() {
    List<Bet> bets = mongo.find(
        Query.query(Criteria.where("status").is("cashed_out"))
            .with(Sort.by(Sort.Direction.DESC, "win_amount"))
            .limit(15),
        Bet.class);
    return bets.stream().map(b -> {
      User u = findById(b.userId);
      Map<String, Object> m = new LinkedHashMap<>();
      m.put("id", b.id);
      m.put("bet_amount", b.betAmount);
      m.put("cashout_multiplier", b.cashoutMultiplier);
      m.put("win_amount", b.winAmount);
      m.put("created_at", b.createdAt);
      m.put("username", u != null ? u.username : "Unknown");
      return m;
    }).collect(Collectors.toList());
  }

  public synchronized List<Map<String, Object>> userBets(long userId) {
    List<Bet> list = mongo.find(
        Query.query(Criteria.where("user_id").is(userId))
            .with(Sort.by(Sort.Direction.DESC, "_id"))
            .limit(40),
        Bet.class);
    return list.stream().map(b -> {
      GameRound r = mongo.findById(b.roundId, GameRound.class);
      Map<String, Object> m = new LinkedHashMap<>();
      m.put("id", b.id);
      m.put("round_id", b.roundId);
      m.put("bet_amount", b.betAmount);
      m.put("cashout_multiplier", b.cashoutMultiplier);
      m.put("win_amount", b.winAmount);
      m.put("status", b.status);
      m.put("created_at", b.createdAt);
      m.put("round_crash_multiplier", r != null ? r.crashMultiplier : 1.0);
      m.put("round_number", r != null ? r.roundNumber : 0);
      return m;
    }).collect(Collectors.toList());
  }

  private long next(String key) {
    Counter updated = mongo.findAndModify(
        Query.query(Criteria.where("_id").is(key)),
        new Update().inc("seq", 1),
        FindAndModifyOptions.options().returnNew(true).upsert(true),
        Counter.class);
    if (updated == null || updated.seq <= 0) {
      throw new IllegalStateException("Failed to allocate id for counter: " + key);
    }
    return updated.seq;
  }

  public static double round2(double v) {
    return Math.round(v * 100.0) / 100.0;
  }
}
