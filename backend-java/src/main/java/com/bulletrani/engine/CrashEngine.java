package com.bulletrani.engine;

import com.bulletrani.fair.ProvablyFair;
import com.bulletrani.provider.ProviderWalletService;
import com.bulletrani.store.DataStore;
import com.bulletrani.store.Models.Bet;
import com.bulletrani.store.Models.GameRound;
import com.bulletrani.store.Models.User;
import jakarta.annotation.PreDestroy;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.*;

@Component
public class CrashEngine {
  private final DataStore db;
  private final GameBroadcaster bus;
  private final ProviderWalletService provider;

  private volatile String state = "WAITING";
  private volatile double currentMultiplier = 1.00;
  private volatile boolean paused = false;
  private Long pauseStartedAt;
  private boolean awaitingResume = false;
  private Double nextCrashOverride;
  private Double currentCrashOverride;
  /** Provably-fair crash for the round (used whenever real players bet). */
  private double fairCrashMultiplier = 1.00;
  /** True when admin set next-crash for this round. */
  private boolean adminForcedCrash = false;
  private double countdownSeconds = 5;
  private long roundStartTime;
  private String chainTip = "GENESIS";

  private CurrentRound currentRound;
  private final Map<String, ActiveBet> activeBets = new ConcurrentHashMap<>();
  private final List<Map<String, Object>> recentHistory = new CopyOnWriteArrayList<>();

  private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
    Thread t = new Thread(r, "crash-engine");
    t.setDaemon(true);
    return t;
  });
  private ScheduledFuture<?> countdownFuture;
  private ScheduledFuture<?> tickFuture;

  private record Bot(long id, String username, String avatar) {}
  private final List<Bot> bots = List.of(
      new Bot(-1, "AeroKing", "✈️"), new Bot(-2, "RedRocket", "🚀"),
      new Bot(-3, "SkyHigh_99", "🦅"), new Bot(-4, "ViperPilot", "⚡"),
      new Bot(-5, "LuckyStrike", "🎯"), new Bot(-6, "CloudSurfer", "☁️"),
      new Bot(-7, "AltitudeAce", "🛩️"), new Bot(-8, "JetStreamer", "💨")
  );

  public static class CurrentRound {
    public long id;
    public long roundNumber;
    public String serverSeed;
    public String clientSeed;
    public long nonce;
    public String hash;
    public String publicHash;
    public String prevChainHash;
    public String chainHash;
    public double crashMultiplier;
    public double houseEdge;
  }

  public CrashEngine(DataStore db, GameBroadcaster bus, ProviderWalletService provider) {
    this.db = db;
    this.bus = bus;
    this.provider = provider;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void start() {
    chainTip = db.lastChainHash();
    for (GameRound r : db.recentCompleted(35)) {
      recentHistory.add(0, roundHistoryMap(r));
    }
    prepareNewRound();
  }

  @PreDestroy
  public void shutdown() {
    cancelTimers();
    scheduler.shutdownNow();
  }

  private Map<String, Object> roundHistoryMap(GameRound r) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("roundNumber", r.roundNumber);
    m.put("crashMultiplier", r.crashMultiplier);
    m.put("serverSeed", r.serverSeed);
    m.put("clientSeed", r.clientSeed);
    m.put("nonce", r.nonce);
    m.put("hash", r.hash);
    m.put("publicHash", r.seedHash);
    m.put("seed_hash", r.seedHash);
    m.put("chain_hash", r.chainHash);
    return m;
  }

  public synchronized void prepareNewRound() {
    if (paused) {
      state = "WAITING";
      awaitingResume = true;
      bus.emitToAdmins("admin:engine", getAdminEngineState());
      return;
    }
    awaitingResume = false;
    state = "WAITING";
    activeBets.clear();
    currentMultiplier = 1.00;
    currentCrashOverride = null;
    adminForcedCrash = false;

    long roundNumber = db.maxRoundNumber() + 1;
    String serverSeed = ProvablyFair.generateServerSeed();
    String clientSeed = "0000000000000000000" + ThreadLocalRandom.current().nextLong(9999999999L);
    long nonce = roundNumber;
    double houseEdge = db.getSettingDouble("house_edge", 3.0);
    Map<String, Object> calc = ProvablyFair.calculateMultiplier(serverSeed, clientSeed, houseEdge, nonce);
    double crashMultiplier = ((Number) calc.get("multiplier")).doubleValue();
    String hash = (String) calc.get("hash");
    fairCrashMultiplier = crashMultiplier;

    if (nextCrashOverride != null) {
      crashMultiplier = nextCrashOverride;
      currentCrashOverride = crashMultiplier;
      adminForcedCrash = true;
      nextCrashOverride = null;
    }

    String publicHash = ProvablyFair.hashSeed(serverSeed);
    String prevChainHash = chainTip == null ? "GENESIS" : chainTip;
    String chainHash = ProvablyFair.chainHash(prevChainHash, publicHash, nonce);

    GameRound saved = db.insertRound(roundNumber, serverSeed, clientSeed, hash, publicHash, nonce, chainHash, crashMultiplier);
    CurrentRound cr = new CurrentRound();
    cr.id = saved.id;
    cr.roundNumber = roundNumber;
    cr.serverSeed = serverSeed;
    cr.clientSeed = clientSeed;
    cr.nonce = nonce;
    cr.hash = hash;
    cr.publicHash = publicHash;
    cr.prevChainHash = prevChainHash;
    cr.chainHash = chainHash;
    cr.crashMultiplier = crashMultiplier;
    cr.houseEdge = houseEdge;
    currentRound = cr;

    countdownSeconds = db.getSettingDouble("countdown_seconds", 5.0);
    seedBotBets();

    Map<String, Object> prep = new LinkedHashMap<>();
    prep.put("roundNumber", cr.roundNumber);
    prep.put("countdownSeconds", countdownSeconds);
    prep.put("publicHash", cr.publicHash);
    prep.put("nonce", cr.nonce);
    prep.put("chainHash", cr.chainHash);
    prep.put("activeBets", getAllBetsArray());
    bus.emit("round:preparing", prep);
    bus.emitToAdmins("admin:engine", getAdminEngineState());
    startCountdown((long) (countdownSeconds * 1000));
  }

  private void startCountdown(long remainingMs) {
    cancelCountdown();
    final long totalMs = Math.max(remainingMs, (long) (countdownSeconds * 1000));
    final long[] left = { remainingMs };
    countdownFuture = scheduler.scheduleAtFixedRate(() -> {
      if (paused) return;
      left[0] -= 100;
      Map<String, Object> tick = new LinkedHashMap<>();
      tick.put("remainingMs", Math.max(0, left[0]));
      tick.put("progress", String.format(Locale.US, "%.3f", Math.max(0, left[0] / (double) totalMs)));
      bus.emit("round:countdown_tick", tick);
      if (left[0] <= 0) {
        cancelCountdown();
        launchFlight();
      }
    }, 0, 100, TimeUnit.MILLISECONDS);
  }

  private void seedBotBets() {
    int n = 3 + ThreadLocalRandom.current().nextInt(4);
    List<Bot> shuffled = new ArrayList<>(bots);
    Collections.shuffle(shuffled);
    double[] amounts = {50, 100, 200, 500, 1000, 2500};
    for (int i = 0; i < n; i++) {
      Bot bot = shuffled.get(i);
      ActiveBet b = new ActiveBet();
      b.id = "bot_" + bot.id + "_" + System.currentTimeMillis();
      b.userId = bot.id;
      b.username = bot.username;
      b.avatar = bot.avatar;
      b.panelId = 1;
      b.betAmount = amounts[ThreadLocalRandom.current().nextInt(amounts.length)];
      b.status = "active";
      b.autoCashout = DataStore.round2(1.2 + ThreadLocalRandom.current().nextDouble() * 4.5);
      b.isBot = true;
      b.winAmount = 0;
      activeBets.put(String.valueOf(b.id), b);
    }
  }

  public synchronized void launchFlight() {
    if (paused || currentRound == null) return;
    state = "FLYING";
    roundStartTime = System.currentTimeMillis();
    currentMultiplier = 1.00;
    // Real bets → provably-fair calc; bots-only → entertainment crash
    resolveCrashTargetAtLaunch();
    db.setRoundInProgress(currentRound.id);

    Map<String, Object> started = new LinkedHashMap<>();
    started.put("roundNumber", currentRound.roundNumber);
    started.put("activeBets", getAllBetsArray());
    bus.emit("round:started", started);
    bus.emitToAdmins("admin:engine", getAdminEngineState());

    cancelTick();
    tickFuture = scheduler.scheduleAtFixedRate(() -> {
      if (paused) return;
      long elapsed = System.currentTimeMillis() - roundStartTime;
      double elapsedSec = elapsed / 1000.0;
      double calculated = 1.00 + (Math.exp(0.065 * elapsedSec) - 1) + (0.015 * elapsedSec * elapsedSec);
      currentMultiplier = DataStore.round2(calculated);
      Double target = getCrashTarget();
      if (target != null && currentMultiplier >= target) {
        cancelTick();
        crashFlight(target);
        return;
      }
      processAutoCashouts(currentMultiplier);
      Map<String, Object> tick = new LinkedHashMap<>();
      tick.put("multiplier", currentMultiplier);
      tick.put("elapsedMs", elapsed);
      bus.emit("round:tick", tick);
    }, 0, 35, TimeUnit.MILLISECONDS);
  }

  private boolean hasRealPlayerBets() {
    for (ActiveBet b : activeBets.values()) {
      if (!b.isBot && "active".equals(b.status)) return true;
    }
    return false;
  }

  /**
   * Real player bets → ProvablyFair with the latest admin house_edge (+ max crash cap).
   * Recomputed at launch so settings saved during countdown actually apply.
   * Bots-only → same curve for believable history.
   * Admin next/live crash override always wins.
   */
  private void resolveCrashTargetAtLaunch() {
    if (currentRound == null) return;
    if (adminForcedCrash) return;

    double houseEdgePct = db.getSettingDouble("house_edge", 3.0);
    currentRound.houseEdge = houseEdgePct;
    Map<String, Object> calc = ProvablyFair.calculateMultiplier(
        currentRound.serverSeed, currentRound.clientSeed, houseEdgePct, currentRound.nonce);
    fairCrashMultiplier = ((Number) calc.get("multiplier")).doubleValue();

    double maxCrash = db.getSettingDouble("max_crash_multiplier", 20.0);
    if (maxCrash < 1.0) maxCrash = 1.0;
    double cappedFair = DataStore.round2(Math.min(fairCrashMultiplier, maxCrash));

    if (hasRealPlayerBets()) {
      currentCrashOverride = null;
      currentRound.crashMultiplier = cappedFair;
      db.updateRoundCrashMultiplier(currentRound.id, cappedFair);
      return;
    }

    // Bots-only entertainment: Bustabit-shaped sample (same formula as ProvablyFair).
    double houseEdge = houseEdgePct / 100.0;
    double floatVal = ThreadLocalRandom.current().nextDouble();
    double target;
    if (floatVal < houseEdge) {
      target = 1.00;
    } else {
      double raw = (1.0 - houseEdge) / (1.0 - floatVal);
      target = Math.max(1.01, Math.floor(raw * 100.0) / 100.0);
    }
    target = DataStore.round2(Math.max(1.00, Math.min(target, maxCrash)));
    currentRound.crashMultiplier = target;
    currentCrashOverride = target;
  }

  private double realStakeInRound() {
    double sum = 0;
    for (ActiveBet b : activeBets.values()) {
      if (!b.isBot && !"cancelled".equals(b.status)) sum += b.betAmount;
    }
    return sum;
  }

  private void processAutoCashouts(double mult) {
    Double crashTarget = getCrashTarget();
    for (Map.Entry<String, ActiveBet> e : activeBets.entrySet()) {
      ActiveBet bet = e.getValue();
      if (!"active".equals(bet.status) || bet.autoCashout == null || crashTarget == null) continue;
      if (bet.autoCashout >= crashTarget) continue;
      if (mult >= bet.autoCashout) cashoutBet(e.getKey(), bet.autoCashout, true);
    }
  }

  public synchronized Map<String, Object> cashoutBet(String betKey, Double forcedMultiplier, boolean isAuto) {
    ActiveBet bet = activeBets.get(betKey);
    Map<String, Object> fail = new LinkedHashMap<>();
    if (bet == null || !"active".equals(bet.status)) {
      fail.put("success", false); fail.put("message", "Bet is not active or already cashed out");
      return fail;
    }
    if (!"FLYING".equals(state)) {
      fail.put("success", false); fail.put("message", "Cannot cashout outside flying phase");
      return fail;
    }
    Double crashTarget = getCrashTarget();
    if (crashTarget == null) {
      fail.put("success", false); fail.put("message", "No active crash target");
      return fail;
    }
    double cashoutMultiplier = forcedMultiplier != null ? forcedMultiplier : currentMultiplier;
    cashoutMultiplier = Math.min(cashoutMultiplier, currentMultiplier);
    cashoutMultiplier = DataStore.round2(cashoutMultiplier);
    if (cashoutMultiplier >= crashTarget) {
      fail.put("success", false); fail.put("message", "Cashout rejected — at or past crash point");
      return fail;
    }
    double maxAllowed = DataStore.round2(crashTarget - 0.01);
    if (cashoutMultiplier > maxAllowed) cashoutMultiplier = maxAllowed;
    if (cashoutMultiplier >= crashTarget || cashoutMultiplier > currentMultiplier) {
      fail.put("success", false); fail.put("message", "Cashout rejected by server validation");
      return fail;
    }

    double maxPayout = db.getSettingDouble("max_payout", 1000000);
    double winAmount = DataStore.round2(bet.betAmount * cashoutMultiplier);
    if (winAmount > maxPayout) winAmount = maxPayout;

    bet.status = "cashed_out";
    bet.cashoutMultiplier = cashoutMultiplier;
    bet.winAmount = winAmount;

    if (!bet.isBot && bet.id instanceof Number) {
      db.cashoutBetDb(((Number) bet.id).longValue(), cashoutMultiplier, winAmount);
      settleWin(bet, winAmount, cashoutMultiplier);
    }

    Map<String, Object> evt = new LinkedHashMap<>();
    evt.put("betId", bet.id);
    evt.put("userId", bet.userId);
    evt.put("username", bet.username);
    evt.put("betAmount", bet.betAmount);
    evt.put("multiplier", cashoutMultiplier);
    evt.put("winAmount", winAmount);
    evt.put("isAuto", isAuto);
    bus.emit("round:cashout", evt);

    Map<String, Object> ok = new LinkedHashMap<>();
    ok.put("success", true);
    ok.put("multiplier", cashoutMultiplier);
    ok.put("winAmount", winAmount);
    return ok;
  }

  public synchronized Map<String, Object> cashoutBet(String betKey) {
    return cashoutBet(betKey, null, false);
  }

  public synchronized void crashFlight(double finalMultiplier) {
    state = "CRASHED";
    currentMultiplier = finalMultiplier;
    for (ActiveBet bet : activeBets.values()) {
      if ("active".equals(bet.status)) {
        bet.status = "lost";
        if (!bet.isBot && bet.id instanceof Number) {
          db.markBet(((Number) bet.id).longValue(), "lost");
        }
      }
    }
    if (currentRound != null) {
      db.completeRound(currentRound.id, finalMultiplier);
      chainTip = currentRound.chainHash;

      Map<String, Object> roundResult = new LinkedHashMap<>();
      roundResult.put("roundNumber", currentRound.roundNumber);
      roundResult.put("crashMultiplier", finalMultiplier);
      roundResult.put("serverSeed", currentRound.serverSeed);
      roundResult.put("clientSeed", currentRound.clientSeed);
      roundResult.put("nonce", currentRound.nonce);
      roundResult.put("hash", currentRound.hash);
      roundResult.put("publicHash", currentRound.publicHash);
      roundResult.put("seed_hash", currentRound.publicHash);
      roundResult.put("chain_hash", currentRound.chainHash);
      roundResult.put("prev_chain_hash", currentRound.prevChainHash);
      recentHistory.add(roundResult);
      while (recentHistory.size() > 50) recentHistory.remove(0);

      Map<String, Object> crashed = new LinkedHashMap<>();
      crashed.put("roundNumber", currentRound.roundNumber);
      crashed.put("finalMultiplier", finalMultiplier);
      crashed.put("serverSeed", currentRound.serverSeed);
      crashed.put("clientSeed", currentRound.clientSeed);
      crashed.put("nonce", currentRound.nonce);
      crashed.put("hash", currentRound.hash);
      crashed.put("publicHash", currentRound.publicHash);
      crashed.put("chainHash", currentRound.chainHash);
      crashed.put("prevChainHash", currentRound.prevChainHash);
      crashed.put("allBets", getAllBetsArray());
      bus.emit("round:crashed", crashed);
    }
    scheduler.schedule(this::prepareNewRound, 3500, TimeUnit.MILLISECONDS);
  }

  public synchronized Map<String, Object> placeBet(long userId, int panelId, double amount, Double autoCashout) {
    return placeBet(userId, panelId, amount, autoCashout, null);
  }

  public synchronized Map<String, Object> placeBet(long userId, int panelId, double amount, Double autoCashout, String sessionToken) {
    Map<String, Object> fail = new LinkedHashMap<>();
    if (paused) { fail.put("success", false); fail.put("message", "Game is paused by admin"); return fail; }
    if (!"WAITING".equals(state)) { fail.put("success", false); fail.put("message", "Bets are only accepted during countdown"); return fail; }
    double minBet = db.getSettingDouble("min_bet", 10);
    double maxBet = db.getSettingDouble("max_bet", 10000);
    if (Double.isNaN(amount) || amount < minBet || amount > maxBet) {
      fail.put("success", false); fail.put("message", "Bet must be between ₹" + minBet + " and ₹" + maxBet); return fail;
    }
    double maxRoundStake = db.getSettingDouble("max_round_stake", 0);
    if (maxRoundStake > 0 && realStakeInRound() + amount > maxRoundStake) {
      fail.put("success", false);
      fail.put("message", "Round stake limit reached — try the next round");
      return fail;
    }
    String key = userId + "_" + panelId;
    if (activeBets.containsKey(key)) {
      fail.put("success", false); fail.put("message", "You already have an active bet on this panel"); return fail;
    }
    User user = db.findById(userId);
    if (user == null) { fail.put("success", false); fail.put("message", "User not found"); return fail; }
    if (user.isBanned != 0) { fail.put("success", false); fail.put("message", "Account suspended"); return fail; }

    boolean useProvider = provider.isEnabled() && sessionToken != null && !sessionToken.isBlank();
    String debitTxId = null;
    Double providerBalance = null;

    if (useProvider) {
      debitTxId = ProviderWalletService.newTxId("bet");
      Map<String, Object> debit = provider.debit(
          sessionToken, amount, debitTxId,
          String.valueOf(currentRound.roundNumber), provider.tableId());
      if (!Boolean.TRUE.equals(debit.get("success"))) {
        fail.put("success", false);
        fail.put("message", String.valueOf(debit.getOrDefault("message", "Provider debit failed")));
        return fail;
      }
      Object bal = debit.get("balance");
      if (bal instanceof Number) providerBalance = ((Number) bal).doubleValue();
    } else {
      if (user.balance < amount) { fail.put("success", false); fail.put("message", "Insufficient balance"); return fail; }
      double newBalance = DataStore.round2(user.balance - amount);
      db.updateBalance(userId, newBalance);
      db.insertTx(userId, "bet", -amount, newBalance,
          "Aviator Bet on Panel " + panelId + " (Round #" + currentRound.roundNumber + ")");
      providerBalance = newBalance;
    }

    Double parsedAuto = (autoCashout != null && autoCashout >= 1.01) ? DataStore.round2(autoCashout) : null;
    String walletSource = useProvider ? provider.providerId() : "local";
    String providerCode = useProvider ? provider.gameCode() : null;
    Bet saved = db.insertBet(currentRound.id, userId, panelId, amount, parsedAuto, walletSource, providerCode);

    ActiveBet bet = new ActiveBet();
    bet.id = saved.id;
    bet.userId = userId;
    bet.username = user.username;
    bet.avatar = "🧑‍✈️";
    bet.panelId = panelId;
    bet.betAmount = amount;
    bet.autoCashout = parsedAuto;
    bet.status = "active";
    bet.isBot = false;
    bet.winAmount = 0;
    bet.sessionToken = useProvider ? sessionToken : null;
    bet.debitTxId = debitTxId;
    activeBets.put(key, bet);

    if (providerBalance != null) {
      bus.emitToUser(userId, "wallet:updated", Map.of("balance", providerBalance));
    }
    Map<String, Object> betDto = new LinkedHashMap<>();
    betDto.put("id", bet.id); betDto.put("userId", bet.userId); betDto.put("username", bet.username);
    betDto.put("panelId", bet.panelId); betDto.put("betAmount", bet.betAmount); betDto.put("status", bet.status);
    bus.emit("round:new_bet", Map.of("bet", betDto));

    Map<String, Object> ok = new LinkedHashMap<>();
    ok.put("success", true); ok.put("betId", bet.id); ok.put("newBalance", providerBalance);
    ok.put("provider", useProvider);
    return ok;
  }

  public synchronized Map<String, Object> cancelBet(long userId, int panelId) {
    return cancelBet(userId, panelId, null);
  }

  public synchronized Map<String, Object> cancelBet(long userId, int panelId, String sessionToken) {
    Map<String, Object> fail = new LinkedHashMap<>();
    if (!"WAITING".equals(state)) { fail.put("success", false); fail.put("message", "Can only cancel during countdown"); return fail; }
    String key = userId + "_" + panelId;
    ActiveBet bet = activeBets.get(key);
    if (bet == null || !"active".equals(bet.status)) {
      fail.put("success", false); fail.put("message", "No active bet to cancel"); return fail;
    }

    String token = bet.sessionToken != null ? bet.sessionToken : sessionToken;
    Double newBalance = null;
    if (provider.isEnabled() && token != null && !token.isBlank()) {
      Map<String, Object> credit = provider.credit(
          token, bet.betAmount, ProviderWalletService.newTxId("refund"),
          String.valueOf(currentRound.roundNumber), provider.tableId());
      if (!Boolean.TRUE.equals(credit.get("success"))) {
        fail.put("success", false);
        fail.put("message", String.valueOf(credit.getOrDefault("message", "Provider refund failed")));
        return fail;
      }
      Object bal = credit.get("balance");
      if (bal instanceof Number) newBalance = ((Number) bal).doubleValue();
    } else {
      User user = db.findById(userId);
      newBalance = DataStore.round2(user.balance + bet.betAmount);
      db.updateBalance(userId, newBalance);
      db.insertTx(userId, "deposit", bet.betAmount, newBalance,
          "Refund cancelled Aviator Bet (Round #" + currentRound.roundNumber + ")");
    }

    if (bet.id instanceof Number) db.markBet(((Number) bet.id).longValue(), "cancelled");
    activeBets.remove(key);
    if (newBalance != null) bus.emitToUser(userId, "wallet:updated", Map.of("balance", newBalance));
    bus.emit("round:bet_cancelled", Map.of("betId", bet.id, "userId", userId, "panelId", panelId));
    Map<String, Object> ok = new LinkedHashMap<>();
    ok.put("success", true); ok.put("newBalance", newBalance);
    return ok;
  }

  private void settleWin(ActiveBet bet, double winAmount, double cashoutMultiplier) {
    String token = bet.sessionToken;
    if (provider.isEnabled() && token != null && !token.isBlank()) {
      Map<String, Object> credit = provider.credit(
          token, winAmount, ProviderWalletService.newTxId("win"),
          String.valueOf(currentRound.roundNumber), provider.tableId());
      Object bal = credit.get("balance");
      if (bal instanceof Number) {
        bus.emitToUser(bet.userId, "wallet:updated", Map.of("balance", ((Number) bal).doubleValue()));
      }
      return;
    }
    User user = db.findById(bet.userId);
    if (user == null) return;
    double newBalance = DataStore.round2(user.balance + winAmount);
    db.updateBalance(bet.userId, newBalance);
    db.insertTx(bet.userId, "win", winAmount, newBalance,
        "Aviator Win @ " + cashoutMultiplier + "x (Round #" + currentRound.roundNumber + ")");
    bus.emitToUser(bet.userId, "wallet:updated", Map.of("balance", newBalance));
  }

  public Double getCrashTarget() {
    if (currentCrashOverride != null) return currentCrashOverride;
    return currentRound != null ? currentRound.crashMultiplier : null;
  }

  public List<Map<String, Object>> getAllBetsArray() {
    List<Map<String, Object>> list = new ArrayList<>();
    for (ActiveBet b : activeBets.values()) {
      Map<String, Object> m = new LinkedHashMap<>();
      m.put("id", b.id); m.put("userId", b.userId); m.put("username", b.username);
      m.put("avatar", b.avatar != null ? b.avatar : "🧑‍✈️");
      m.put("panelId", b.panelId); m.put("betAmount", b.betAmount);
      m.put("cashoutMultiplier", b.cashoutMultiplier); m.put("winAmount", b.winAmount);
      m.put("status", b.status); m.put("isBot", b.isBot); m.put("autoCashout", b.autoCashout);
      list.add(m);
    }
    return list;
  }

  public Map<String, Object> getSnapshot(Long userId) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("state", state);
    m.put("currentMultiplier", currentMultiplier);
    m.put("roundNumber", currentRound != null ? currentRound.roundNumber : null);
    m.put("publicHash", currentRound != null ? currentRound.publicHash : null);
    m.put("nonce", currentRound != null ? currentRound.nonce : null);
    m.put("chainHash", currentRound != null ? currentRound.chainHash : null);
    m.put("countdownSeconds", countdownSeconds);
    m.put("paused", paused);
    m.put("recentHistory", recentHistory.size() > 25 ? recentHistory.subList(recentHistory.size() - 25, recentHistory.size()) : recentHistory);
    m.put("allBets", getAllBetsArray());
    if (userId != null) {
      List<Map<String, Object>> mine = new ArrayList<>();
      for (ActiveBet b : activeBets.values()) {
        if (b.userId != userId) continue;
        mine.add(publicBetDto(b));
      }
      m.put("myActiveBets", mine);
    } else m.put("myActiveBets", List.of());
    return m;
  }

  /** Public bet shape — never includes sessionToken / debitTxId. */
  private static Map<String, Object> publicBetDto(ActiveBet b) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", b.id);
    m.put("userId", b.userId);
    m.put("username", b.username);
    m.put("avatar", b.avatar != null ? b.avatar : "🧑‍✈️");
    m.put("panelId", b.panelId);
    m.put("betAmount", b.betAmount);
    m.put("cashoutMultiplier", b.cashoutMultiplier);
    m.put("winAmount", b.winAmount);
    m.put("status", b.status);
    m.put("isBot", b.isBot);
    m.put("autoCashout", b.autoCashout);
    return m;
  }

  public Map<String, Object> getAdminEngineState() {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("state", state); m.put("paused", paused);
    m.put("currentMultiplier", currentMultiplier);
    m.put("roundNumber", currentRound != null ? currentRound.roundNumber : null);
    m.put("crashTarget", getCrashTarget());
    m.put("nextCrashOverride", nextCrashOverride);
    m.put("publicHash", currentRound != null ? currentRound.publicHash : null);
    m.put("nonce", currentRound != null ? currentRound.nonce : null);
    m.put("chainHash", currentRound != null ? currentRound.chainHash : null);
    m.put("serverSeed", currentRound != null ? currentRound.serverSeed : null);
    m.put("clientSeed", currentRound != null ? currentRound.clientSeed : null);
    m.put("activeBets", getAllBetsArray());
    return m;
  }

  public synchronized Map<String, Object> forceCrash(Double at) {
    if (!"FLYING".equals(state)) return Map.of("success", false, "message", "No active flight to crash");
    cancelTick();
    double crashAt = at != null ? Math.max(currentMultiplier, at) : currentMultiplier;
    crashAt = DataStore.round2(crashAt);
    crashFlight(crashAt);
    return Map.of("success", true, "crashedAt", crashAt);
  }

  public synchronized Map<String, Object> setNextCrashOverride(double mult) {
    if (mult < 1.0) return Map.of("success", false, "message", "Multiplier must be >= 1.00");
    nextCrashOverride = DataStore.round2(mult);
    bus.emitToAdmins("admin:engine", getAdminEngineState());
    return Map.of("success", true, "nextCrashOverride", nextCrashOverride);
  }

  public synchronized Map<String, Object> setCurrentCrashTarget(double mult) {
    if (mult < 1.0) return Map.of("success", false, "message", "Multiplier must be >= 1.00");
    currentCrashOverride = DataStore.round2(mult);
    adminForcedCrash = true;
    if (currentRound != null) currentRound.crashMultiplier = currentCrashOverride;
    if ("FLYING".equals(state) && currentMultiplier >= currentCrashOverride) {
      return forceCrash(currentCrashOverride);
    }
    bus.emitToAdmins("admin:engine", getAdminEngineState());
    return Map.of("success", true, "crashTarget", currentCrashOverride);
  }

  public synchronized Map<String, Object> clearCrashOverrides() {
    nextCrashOverride = null;
    currentCrashOverride = null;
    adminForcedCrash = false;
    if (currentRound != null) currentRound.crashMultiplier = fairCrashMultiplier;
    bus.emitToAdmins("admin:engine", getAdminEngineState());
    return Map.of("success", true);
  }

  public synchronized Map<String, Object> pauseGame() {
    paused = true; pauseStartedAt = System.currentTimeMillis();
    cancelCountdown();
    bus.emitToAdmins("admin:engine", getAdminEngineState());
    bus.emit("round:paused", Map.of("paused", true));
    return Map.of("success", true, "paused", true);
  }

  public synchronized Map<String, Object> resumeGame() {
    if (pauseStartedAt != null && "FLYING".equals(state)) {
      roundStartTime += System.currentTimeMillis() - pauseStartedAt;
    }
    paused = false; pauseStartedAt = null;
    bus.emitToAdmins("admin:engine", getAdminEngineState());
    bus.emit("round:paused", Map.of("paused", false));
    if (awaitingResume) prepareNewRound();
    else if ("WAITING".equals(state) && currentRound != null && countdownFuture == null) {
      startCountdown(Math.max(2000, (long) (countdownSeconds * 1000)));
    }
    return Map.of("success", true, "paused", false);
  }

  public synchronized Map<String, Object> forceStart() {
    if (paused) return Map.of("success", false, "message", "Game is paused — resume first");
    if (!"WAITING".equals(state)) return Map.of("success", false, "message", "Can only force-start during waiting/countdown");
    if (currentRound == null) return Map.of("success", false, "message", "No round prepared");
    cancelCountdown();
    launchFlight();
    return Map.of("success", true);
  }

  private void cancelCountdown() {
    if (countdownFuture != null) { countdownFuture.cancel(false); countdownFuture = null; }
  }
  private void cancelTick() {
    if (tickFuture != null) { tickFuture.cancel(false); tickFuture = null; }
  }
  private void cancelTimers() { cancelCountdown(); cancelTick(); }
}
