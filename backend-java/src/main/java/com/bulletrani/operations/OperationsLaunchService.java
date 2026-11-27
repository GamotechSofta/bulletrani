package com.bulletrani.operations;

import com.bulletrani.config.AppProperties;
import com.bulletrani.security.JwtService;
import com.bulletrani.store.DataStore;
import com.bulletrani.store.Models.User;
import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.atomic.AtomicLong;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Manages Operations Service Launch &amp; Boot configuration, server-side session verification,
 * and server-to-server internal wallet APIs (2051 Initial Balance &amp; 2052 Credit Transfer)
 * with idempotent retries (ERR-0020/0021) and session-expiry detection (ERR-0011/0012/0013).
 * Never exposes X-Internal-Key or server-to-server operations URLs to the browser client.
 */
@Service
public class OperationsLaunchService {
  private static final int MAX_RECENT_LAUNCHES = 25;
  private static final int MAX_ACTIVE_SESSIONS = 1000;
  private static final Gson GSON = new Gson();
  private static final AtomicLong TRAN_SEQ = new AtomicLong(0);
  private static final Pattern ERR_CODE_PATTERN = Pattern.compile("\\b(ERR-\\d{4})\\b", Pattern.CASE_INSENSITIVE);
  private static final Set<String> RETRYABLE_CODES = Set.of("ERR-0020", "ERR-0021");
  private static final Set<String> SESSION_EXPIRED_CODES = Set.of("ERR-0011", "ERR-0012", "ERR-0013");

  @FunctionalInterface
  public interface HttpTransport {
    TransportResponse postJson(String url, String internalKey, String jsonBody) throws Exception;
  }

  public record TransportResponse(int statusCode, String body) {}

  private final AppProperties props;
  private final DataStore db;
  private final JwtService jwt;
  private final HttpTransport transport;
  private final long retryBaseDelayMs;
  private final ConcurrentLinkedDeque<Map<String, Object>> recentLaunches = new ConcurrentLinkedDeque<>();
  private final Map<String, Map<String, Object>> activeSessions = new ConcurrentHashMap<>();

  @Autowired
  public OperationsLaunchService(AppProperties props, DataStore db, JwtService jwt) {
    this(props, db, jwt, defaultTransport(), 250L);
  }

  OperationsLaunchService(AppProperties props, DataStore db, JwtService jwt, HttpTransport transport) {
    this(props, db, jwt, transport, 0L);
  }

  OperationsLaunchService(AppProperties props, DataStore db, JwtService jwt, HttpTransport transport, long retryBaseDelayMs) {
    this.props = props;
    this.db = db;
    this.jwt = jwt;
    this.transport = transport;
    this.retryBaseDelayMs = retryBaseDelayMs;
  }

  private static HttpTransport defaultTransport() {
    HttpClient client = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(8))
        .build();
    return (url, internalKey, jsonBody) -> {
      HttpRequest req = HttpRequest.newBuilder()
          .uri(URI.create(url))
          .timeout(Duration.ofSeconds(12))
          .header("Content-Type", "application/json")
          .header("X-Internal-Key", internalKey)
          .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
          .build();
      HttpResponse<String> res = client.send(req, HttpResponse.BodyHandlers.ofString());
      return new TransportResponse(res.statusCode(), res.body());
    };
  }

  @PostConstruct
  public void loadPersisted() {
    AppProperties.Operations o = props.getOperations();
    String enabled = db.getSetting("ops_enabled", null);
    if (enabled != null) o.setEnabled(asBool(enabled));
    String apiUrl = db.getSetting("ops_api_url", null);
    if (apiUrl != null && !apiUrl.isBlank()) o.setApiUrl(trimTrailingSlash(apiUrl));
    String internalKey = db.getSetting("ops_internal_key", null);
    if (internalKey != null && !internalKey.isBlank()) o.setInternalKey(internalKey.trim());
    String launchUrl = db.getSetting("ops_launch_url", null);
    if (launchUrl != null) o.setLaunchUrl(launchUrl.trim());
    String gameCode = db.getSetting("ops_game_code", null);
    if (gameCode != null) o.setGameCode(gameCode.trim().toUpperCase(Locale.ROOT));
    String gid = db.getSetting("ops_gid", null);
    if (gid != null) o.setGid(gid.trim());
    String partners = db.getSetting("ops_allowed_partners", null);
    if (partners != null) o.setAllowedPartnerCodes(normalizePartners(partners));
    String currency = db.getSetting("ops_default_currency", null);
    if (currency != null && !currency.isBlank()) o.setDefaultCurrency(currency.trim().toUpperCase(Locale.ROOT));
    String lang = db.getSetting("ops_default_lang", null);
    if (lang != null && !lang.isBlank()) o.setDefaultLang(lang.trim().toLowerCase(Locale.ROOT));
    String closeUrl = db.getSetting("ops_default_close_url", null);
    if (closeUrl != null) o.setDefaultCloseUrl(closeUrl.trim());
    String strictParams = db.getSetting("ops_strict_params", null);
    if (strictParams != null) o.setStrictParams(asBool(strictParams));
    String showExit = db.getSetting("ops_show_exit_button", null);
    if (showExit != null) o.setShowExitButton(asBool(showExit));
    String retryCount = db.getSetting("ops_retry_count", null);
    if (retryCount != null && !retryCount.isBlank()) {
      try { o.setRetryCount(Integer.parseInt(retryCount.trim())); } catch (NumberFormatException ignored) {}
    }
  }

  public boolean isEnabled() {
    return props.getOperations().isEnabled();
  }

  public boolean isWalletReady() {
    AppProperties.Operations o = props.getOperations();
    return o.isEnabled() && hasText(o.getApiUrl()) && hasText(o.getInternalKey());
  }

  String walletBaseUrl() {
    String base = trimTrailingSlash(props.getOperations().getApiUrl());
    if (base.toLowerCase(Locale.ROOT).endsWith("/api/v1")) {
      base = base.substring(0, base.length() - "/api/v1".length());
    }
    return trimTrailingSlash(base);
  }

  /** Admin-facing config: masks X-Internal-Key, safe to render in Admin UI. */
  public Map<String, Object> getAdminConfig() {
    AppProperties.Operations o = props.getOperations();
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("enabled", o.isEnabled());
    m.put("active", isWalletReady());
    m.put("apiUrl", nullToEmpty(o.getApiUrl()));
    m.put("internalKeyConfigured", hasText(o.getInternalKey()));
    m.put("internalKeyMasked", maskKey(o.getInternalKey()));
    m.put("launchUrl", nullToEmpty(o.getLaunchUrl()));
    m.put("gameCode", nullToEmpty(o.getGameCode()));
    m.put("gid", nullToEmpty(o.getGid()));
    m.put("allowedPartnerCodes", nullToEmpty(o.getAllowedPartnerCodes()));
    m.put("defaultCurrency", hasText(o.getDefaultCurrency()) ? o.getDefaultCurrency() : "INR");
    m.put("defaultLang", hasText(o.getDefaultLang()) ? o.getDefaultLang() : "en");
    m.put("defaultCloseUrl", nullToEmpty(o.getDefaultCloseUrl()));
    m.put("strictParams", o.isStrictParams());
    m.put("showExitButton", o.isShowExitButton());
    m.put("retryCount", o.getRetryCount());
    m.put("walletPathPrefix", "/api/v1/wallet/*");
    return m;
  }

  /** Browser-safe boot defaults — never exposes apiUrl or X-Internal-Key. */
  public Map<String, Object> getClientBootConfig() {
    AppProperties.Operations o = props.getOperations();
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("enabled", o.isEnabled());
    m.put("gameCode", nullToEmpty(o.getGameCode()));
    m.put("gid", nullToEmpty(o.getGid()));
    m.put("defaultCurrency", hasText(o.getDefaultCurrency()) ? o.getDefaultCurrency() : "INR");
    m.put("defaultLang", hasText(o.getDefaultLang()) ? o.getDefaultLang() : "en");
    m.put("defaultCloseUrl", nullToEmpty(o.getDefaultCloseUrl()));
    m.put("strictParams", o.isStrictParams());
    m.put("showExitButton", o.isShowExitButton());
    m.put("walletReady", isWalletReady());
    return m;
  }

  public List<Map<String, Object>> getRecentLaunches() {
    return new ArrayList<>(recentLaunches);
  }

  public synchronized Map<String, Object> updateConfig(Map<String, Object> body) {
    if (body == null) {
      throw new IllegalArgumentException("Request body is required");
    }
    AppProperties.Operations o = props.getOperations();

    if (body.containsKey("enabled")) {
      o.setEnabled(asBool(body.get("enabled")));
    }
    if (body.containsKey("apiUrl")) {
      String apiUrl = trimTrailingSlash(str(body.get("apiUrl")));
      if (hasText(apiUrl) && !isHttpUrl(apiUrl)) {
        throw new IllegalArgumentException("Operations Base URL must start with http:// or https://");
      }
      o.setApiUrl(apiUrl);
    }
    if (body.containsKey("clearInternalKey") && asBool(body.get("clearInternalKey"))) {
      o.setInternalKey("");
    } else if (body.containsKey("internalKey")) {
      String key = str(body.get("internalKey"));
      if (hasText(key) && !key.contains("•") && !key.contains("*")) {
        o.setInternalKey(key);
      }
    }
    if (body.containsKey("launchUrl")) {
      String launchUrl = str(body.get("launchUrl"));
      if (hasText(launchUrl) && !isHttpUrl(launchUrl)) {
        throw new IllegalArgumentException("Registered launchUrl must start with http:// or https://");
      }
      o.setLaunchUrl(launchUrl);
    }
    if (body.containsKey("gameCode")) {
      o.setGameCode(str(body.get("gameCode")).toUpperCase(Locale.ROOT));
    }
    if (body.containsKey("gid")) {
      o.setGid(str(body.get("gid")));
    }
    if (body.containsKey("allowedPartnerCodes")) {
      o.setAllowedPartnerCodes(normalizePartners(str(body.get("allowedPartnerCodes"))));
    }
    if (body.containsKey("defaultCurrency")) {
      String cur = str(body.get("defaultCurrency")).toUpperCase(Locale.ROOT);
      if (hasText(cur) && !cur.matches("^[A-Z]{3}$")) {
        throw new IllegalArgumentException("Default currency must be a 3-letter ISO code (e.g. INR)");
      }
      o.setDefaultCurrency(hasText(cur) ? cur : "INR");
    }
    if (body.containsKey("defaultLang")) {
      String lang = str(body.get("defaultLang")).toLowerCase(Locale.ROOT);
      if (hasText(lang) && !lang.matches("^[a-z]{2,8}(-[a-z0-9]{2,8})?$")) {
        throw new IllegalArgumentException("Default language must be a valid lowercase code (e.g. en)");
      }
      o.setDefaultLang(hasText(lang) ? lang : "en");
    }
    if (body.containsKey("defaultCloseUrl")) {
      String closeUrl = str(body.get("defaultCloseUrl"));
      if (hasText(closeUrl) && !isSafeRedirectUrl(closeUrl)) {
        throw new IllegalArgumentException("Fallback close_url must be an http(s) URL or relative path starting with /");
      }
      o.setDefaultCloseUrl(closeUrl);
    }
    if (body.containsKey("strictParams")) {
      o.setStrictParams(asBool(body.get("strictParams")));
    }
    if (body.containsKey("showExitButton")) {
      o.setShowExitButton(asBool(body.get("showExitButton")));
    }
    if (body.containsKey("retryCount") && body.get("retryCount") != null) {
      try {
        o.setRetryCount(Integer.parseInt(str(body.get("retryCount"))));
      } catch (NumberFormatException e) {
        throw new IllegalArgumentException("retryCount must be an integer between 0 and 5");
      }
    }

    Map<String, Object> updates = new LinkedHashMap<>();
    updates.put("ops_enabled", String.valueOf(o.isEnabled()));
    updates.put("ops_api_url", nullToEmpty(o.getApiUrl()));
    updates.put("ops_internal_key", nullToEmpty(o.getInternalKey()));
    updates.put("ops_launch_url", nullToEmpty(o.getLaunchUrl()));
    updates.put("ops_game_code", nullToEmpty(o.getGameCode()));
    updates.put("ops_gid", nullToEmpty(o.getGid()));
    updates.put("ops_allowed_partners", nullToEmpty(o.getAllowedPartnerCodes()));
    updates.put("ops_default_currency", hasText(o.getDefaultCurrency()) ? o.getDefaultCurrency() : "INR");
    updates.put("ops_default_lang", hasText(o.getDefaultLang()) ? o.getDefaultLang() : "en");
    updates.put("ops_default_close_url", nullToEmpty(o.getDefaultCloseUrl()));
    updates.put("ops_strict_params", String.valueOf(o.isStrictParams()));
    updates.put("ops_show_exit_button", String.valueOf(o.isShowExitButton()));
    updates.put("ops_retry_count", String.valueOf(o.getRetryCount()));
    db.putSettings(updates);

    return getAdminConfig();
  }

  /**
   * 2051 Initial Balance: POST {baseUrl}/api/v1/wallet/balance with X-Internal-Key.
   */
  public Map<String, Object> fetchBalance2051(String token, String partnerCode) {
    if (!isWalletReady()) {
      return walletFail("Operations base URL or X-Internal-Key is not configured", null, false, false);
    }
    if (!hasText(token) || !hasText(partnerCode)) {
      return walletFail("token and partner_code are required for 2051 balance check", null, false, false);
    }
    Map<String, Object> req = new LinkedHashMap<>();
    req.put("token", token.trim());
    req.put("partner_code", partnerCode.trim().toUpperCase(Locale.ROOT));
    return callWalletApiWithRetry("/api/v1/wallet/balance", req, props.getOperations().getRetryCount());
  }

  /**
   * 2052 Credit Transfer: POST {baseUrl}/api/v1/wallet/credit-transfer with X-Internal-Key.
   */
  public Map<String, Object> creditTransfer2052(
      String token,
      String partnerCode,
      String gid,
      double bet,
      double win,
      String gameType,
      int ttype,
      String roundId,
      String tranId) {
    return creditTransfer2052(token, partnerCode, null, gid, bet, win, gameType, ttype, roundId, tranId);
  }

  /**
   * 2052 Credit Transfer with optional user_id for late win/refund settlement after session close.
   * Retries on network timeout / 502 / ERR-0020 / ERR-0021 using the exact same tranid.
   */
  public Map<String, Object> creditTransfer2052(
      String token,
      String partnerCode,
      String userId,
      String gid,
      double bet,
      double win,
      String gameType,
      int ttype,
      String roundId,
      String tranId) {
    if (!isWalletReady()) {
      return walletFail("Operations base URL or X-Internal-Key is not configured", null, false, false);
    }
    boolean hasToken = hasText(token);
    boolean hasPartnerAndUser = hasText(partnerCode) && hasText(userId);
    if (!hasToken && !hasPartnerAndUser) {
      return walletFail("token (or partner_code + user_id) is required for 2052 credit-transfer", null, false, false);
    }

    Map<String, Object> req = new LinkedHashMap<>();
    if (hasToken) {
      req.put("token", token.trim());
    }
    if (hasText(partnerCode)) {
      req.put("partner_code", partnerCode.trim().toUpperCase(Locale.ROOT));
    }
    if (hasText(userId)) {
      req.put("user_id", userId.trim());
    }
    if (hasText(gid)) {
      String cleanGid = gid.trim();
      req.put("gid", cleanGid.matches("^\\d+$") ? Long.parseLong(cleanGid) : cleanGid);
    }
    req.put("bet", DataStore.round2(bet));
    req.put("win", DataStore.round2(win));
    req.put("game_type", hasText(gameType) ? gameType.trim() : "spin");
    req.put("tranid", tranId);
    req.put("ttype", ttype);
    req.put("roundid", roundId);

    Map<String, Object> res = callWalletApiWithRetry(
        "/api/v1/wallet/credit-transfer", req, props.getOperations().getRetryCount());
    res.put("tranId", tranId);
    res.put("roundId", roundId);
    if (Boolean.TRUE.equals(res.get("success")) && res.get("balance") != null && hasToken) {
      Map<String, Object> cached = activeSessions.get(token.trim());
      if (cached != null) {
        cached.put("balance", res.get("balance"));
      }
    }
    return res;
  }

  /**
   * Serializes the payload once so every retry on timeout / 502 / ERR-0020 / ERR-0021
   * reuses the exact same tranid.
   */
  private Map<String, Object> callWalletApiWithRetry(String path, Map<String, Object> body, int maxRetries) {
    String url = walletBaseUrl() + path;
    String key = props.getOperations().getInternalKey();
    String jsonBody = GSON.toJson(body);
    int attempts = Math.max(0, maxRetries) + 1;
    Map<String, Object> lastResult = null;

    for (int attempt = 0; attempt < attempts; attempt++) {
      if (attempt > 0 && retryBaseDelayMs > 0) {
        try {
          Thread.sleep(retryBaseDelayMs * attempt);
        } catch (InterruptedException ie) {
          Thread.currentThread().interrupt();
          break;
        }
      }
      lastResult = callWalletApiOnce(url, key, jsonBody);
      lastResult.put("attempts", attempt + 1);
      if (Boolean.TRUE.equals(lastResult.get("success")) || !Boolean.TRUE.equals(lastResult.get("retryable"))) {
        return lastResult;
      }
    }
    return lastResult;
  }

  private Map<String, Object> callWalletApiOnce(String url, String key, String jsonBody) {
    try {
      TransportResponse resp = transport.postJson(url, key, jsonBody);
      String raw = resp.body() == null ? "" : resp.body().trim();
      int code = resp.statusCode();

      if (raw.isEmpty()) {
        boolean retryable = isRetryableHttp(code);
        boolean expired = isExpiredHttp(code);
        return walletFail("Empty response from Operations API (HTTP " + code + ")", null, expired, retryable);
      }

      JsonElement parsedEl;
      try {
        parsedEl = JsonParser.parseString(raw);
      } catch (Exception parseEx) {
        boolean retryable = isRetryableHttp(code);
        return walletFail("Invalid JSON response from Operations API (HTTP " + code + ")", null, isExpiredHttp(code), retryable);
      }
      if (!parsedEl.isJsonObject()) {
        return walletFail("Invalid JSON response from Operations API (HTTP " + code + ")", null, isExpiredHttp(code), isRetryableHttp(code));
      }

      JsonObject obj = parsedEl.getAsJsonObject();
      String errorCode = extractErrorCode(obj, raw);
      boolean okStatus = isStatusTrue(obj.get("status"));

      if (code < 200 || code >= 300 || !okStatus) {
        String err = extractErrorMessage(obj, "Operations wallet returned status=false (HTTP " + code + ")");
        boolean retryable = isRetryableHttp(code) || (errorCode != null && RETRYABLE_CODES.contains(errorCode));
        boolean expired = isExpiredHttp(code)
            || (errorCode != null && SESSION_EXPIRED_CODES.contains(errorCode))
            || isSessionExpiredMessage(err);
        Map<String, Object> fail = walletFail(err, errorCode, expired, retryable);
        fail.put("httpStatus", code);
        fail.put("raw", raw);
        return fail;
      }

      Double balance = readAuthoritativeBalance(obj);
      if (balance == null) {
        Map<String, Object> fail = walletFail(
            "Operations wallet did not return numeric Float balance in message", errorCode, false, false);
        fail.put("httpStatus", code);
        fail.put("raw", raw);
        return fail;
      }

      Map<String, Object> ok = new LinkedHashMap<>();
      ok.put("success", true);
      ok.put("status", true);
      ok.put("balance", balance);
      ok.put("httpStatus", code);
      ok.put("raw", raw);
      return ok;
    } catch (Exception e) {
      return walletFail("Operations wallet network error: " + e.getMessage(), "ERR-0020", false, true);
    }
  }

  /**
   * Validates launch query parameters sent from the game client on boot.
   * On live boots (dryRun == false), fetches initial balance via 2051 and provisions a shadow player + JWT.
   */
  public Map<String, Object> bootSession(Map<String, ?> params, boolean dryRun) {
    AppProperties.Operations o = props.getOperations();
    List<String> warnings = new ArrayList<>();

    if (!o.isEnabled()) {
      if (!dryRun) {
        return fail("Operations Launch integration is disabled in Admin");
      }
      warnings.add("Operations Launch integration is currently disabled (dry-run validation only)");
    }

    String token = pick(params, "token");
    String partnerCodeRaw = pick(params, "partner_code", "partnerCode");
    String gid = pick(params, "gid");
    String gameCodeRaw = pick(params, "game_code", "gameCode");
    String username = pick(params, "username");
    String userId = pick(params, "user_id", "userId");
    String currencyRaw = pick(params, "currency");
    String langRaw = pick(params, "lang");
    String extsess = pick(params, "extsess");
    String closeUrlRaw = pick(params, "close_url", "closeUrl");

    if (!hasText(token)) {
      return fail("Missing required query parameter: token");
    }
    if (o.isStrictParams()) {
      List<String> missing = new ArrayList<>();
      if (!hasText(partnerCodeRaw)) missing.add("partner_code");
      if (!hasText(gid)) missing.add("gid");
      if (!hasText(gameCodeRaw)) missing.add("game_code");
      if (!hasText(username)) missing.add("username");
      if (!missing.isEmpty()) {
        return fail("Missing required launch parameters: " + String.join(", ", missing));
      }
    }

    String partnerCode = hasText(partnerCodeRaw) ? partnerCodeRaw.toUpperCase(Locale.ROOT) : "";
    String gameCode = hasText(gameCodeRaw) ? gameCodeRaw.toUpperCase(Locale.ROOT) : "";

    Set<String> allowedPartners = parsePartnerSet(o.getAllowedPartnerCodes());
    if (!allowedPartners.isEmpty()) {
      if (!hasText(partnerCode) || !allowedPartners.contains(partnerCode)) {
        return fail("Operator partner_code is not allowed: " + (hasText(partnerCode) ? partnerCode : "(empty)"));
      }
    }

    if (hasText(o.getGameCode()) && hasText(gameCode) && !o.getGameCode().equalsIgnoreCase(gameCode)) {
      return fail("Unexpected game_code: expected " + o.getGameCode() + ", got " + gameCode);
    }

    if (hasText(o.getGid()) && hasText(gid) && !o.getGid().equals(gid)) {
      return fail("Unexpected gid: expected " + o.getGid() + ", got " + gid);
    }

    String currency = hasText(currencyRaw)
        ? currencyRaw.toUpperCase(Locale.ROOT)
        : (hasText(o.getDefaultCurrency()) ? o.getDefaultCurrency() : "INR");
    if (!currency.matches("^[A-Z]{3}$")) {
      return fail("Invalid currency code: must be a 3-letter ISO code");
    }

    String lang = hasText(langRaw)
        ? langRaw.toLowerCase(Locale.ROOT)
        : (hasText(o.getDefaultLang()) ? o.getDefaultLang() : "en");

    String closeUrl = null;
    if (hasText(closeUrlRaw)) {
      if (!isSafeRedirectUrl(closeUrlRaw)) {
        return fail("Unsafe close_url protocol");
      }
      closeUrl = closeUrlRaw;
    } else if (hasText(o.getDefaultCloseUrl()) && isSafeRedirectUrl(o.getDefaultCloseUrl())) {
      closeUrl = o.getDefaultCloseUrl();
    }

    if (!isWalletReady()) {
      if (!dryRun) {
        return fail("Operations Base URL or X-Internal-Key is not configured in Admin");
      }
      warnings.add("Operations base URL or X-Internal-Key is not configured yet");
    }

    Map<String, Object> session = new LinkedHashMap<>();
    session.put("partnerCode", hasText(partnerCode) ? partnerCode : null);
    session.put("gid", hasText(gid) ? gid : null);
    session.put("gameCode", hasText(gameCode) ? gameCode : (hasText(o.getGameCode()) ? o.getGameCode() : null));
    session.put("username", hasText(username) ? username : "Player");
    session.put("userId", hasText(userId) ? userId : null);
    session.put("currency", currency);
    session.put("lang", lang);
    session.put("extsess", hasText(extsess) ? extsess : null);
    session.put("closeUrl", closeUrl);

    Double initialBalance = null;
    Long localUserId = null;
    String playerJwt = null;

    if (!dryRun) {
      if (!hasText(partnerCode)) {
        return fail("partner_code is required to fetch initial balance (2051)");
      }
      Map<String, Object> balRes = fetchBalance2051(token, partnerCode);
      if (!Boolean.TRUE.equals(balRes.get("success"))) {
        Map<String, Object> errMap = fail(String.valueOf(balRes.getOrDefault("message", "Initial balance check (2051) failed")));
        if (balRes.get("errorCode") != null) errMap.put("errorCode", balRes.get("errorCode"));
        if (Boolean.TRUE.equals(balRes.get("sessionExpired"))) errMap.put("sessionExpired", true);
        return errMap;
      }
      initialBalance = ((Number) balRes.get("balance")).doubleValue();

      User localUser = db.findOrCreateOperationsUser(partnerCode, userId, String.valueOf(session.get("username")));
      localUserId = localUser.id;
      playerJwt = jwt.issue(localUser);

      if (activeSessions.size() >= MAX_ACTIVE_SESSIONS) {
        activeSessions.clear();
      }
      Map<String, Object> stored = new LinkedHashMap<>(session);
      stored.put("token", token);
      stored.put("localUserId", localUserId);
      stored.put("balance", initialBalance);
      stored.put("bootedAt", Instant.now().toString());
      activeSessions.put(token, stored);

      Map<String, Object> logRow = new LinkedHashMap<>();
      logRow.put("tokenMasked", maskKey(token));
      logRow.put("partnerCode", session.get("partnerCode"));
      logRow.put("gid", session.get("gid"));
      logRow.put("gameCode", session.get("gameCode"));
      logRow.put("username", session.get("username"));
      logRow.put("userId", session.get("userId"));
      logRow.put("localUserId", localUserId);
      logRow.put("balance", initialBalance);
      logRow.put("currency", currency);
      logRow.put("lang", lang);
      logRow.put("extsess", session.get("extsess"));
      logRow.put("hasCloseUrl", closeUrl != null);
      logRow.put("bootedAt", stored.get("bootedAt"));
      recentLaunches.addFirst(logRow);
      while (recentLaunches.size() > MAX_RECENT_LAUNCHES) {
        recentLaunches.pollLast();
      }
    }

    Map<String, Object> out = new LinkedHashMap<>();
    out.put("success", true);
    out.put("dryRun", dryRun);
    if (!dryRun) {
      out.put("jwt", playerJwt);
      out.put("userId", localUserId);
      out.put("balance", initialBalance);
    }
    out.put("session", session);
    out.put("ui", Map.of(
        "showExitButton", o.isShowExitButton() && closeUrl != null,
        "walletReady", isWalletReady()
    ));
    if (!warnings.isEmpty()) {
      out.put("warnings", warnings);
    }
    return out;
  }

  public Map<String, Object> getSessionByToken(String token) {
    return hasText(token) ? activeSessions.get(token.trim()) : null;
  }

  public static String newTranId(String gid, String roundId, int panelId, String kind) {
    String prefix = hasText(gid) ? gid.trim() : "0";
    long seq = TRAN_SEQ.incrementAndGet();
    String timeTag = Long.toString(System.currentTimeMillis() % 1000000L, 36);
    return prefix + "-" + roundId + "-" + panelId + "-" + kind + "-" + timeTag + seq;
  }

  static boolean isHttpUrl(String raw) {
    try {
      URI u = URI.create(raw.trim());
      String scheme = u.getScheme();
      return ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) && hasText(u.getHost());
    } catch (Exception e) {
      return false;
    }
  }

  static boolean isSafeRedirectUrl(String raw) {
    if (!hasText(raw)) return false;
    String t = raw.trim();
    if (t.startsWith("/") && !t.startsWith("//")) return true;
    return isHttpUrl(t);
  }

  private static boolean isRetryableHttp(int status) {
    return status == 502 || status == 503 || status == 504 || status == 408;
  }

  private static boolean isExpiredHttp(int status) {
    return status == 401 || status == 403 || status == 410;
  }

  private static boolean isSessionExpiredMessage(String msg) {
    if (!hasText(msg)) return false;
    String lower = msg.toLowerCase(Locale.ROOT);
    return lower.contains("session expired") || lower.contains("session invalid") || lower.contains("invalid session");
  }

  private static String extractErrorCode(JsonObject obj, String raw) {
    for (String key : new String[]{"code", "error_code", "errorCode"}) {
      if (obj.has(key) && !obj.get(key).isJsonNull() && obj.get(key).isJsonPrimitive()) {
        String val = obj.get(key).getAsString().trim().toUpperCase(Locale.ROOT);
        if (!val.isEmpty()) return val;
      }
    }
    Matcher m = ERR_CODE_PATTERN.matcher(raw);
    return m.find() ? m.group(1).toUpperCase(Locale.ROOT) : null;
  }

  private static boolean isStatusTrue(JsonElement el) {
    if (el == null || el.isJsonNull() || !el.isJsonPrimitive()) return false;
    if (el.getAsJsonPrimitive().isBoolean()) return el.getAsBoolean();
    if (el.getAsJsonPrimitive().isNumber()) return el.getAsInt() == 1;
    return "true".equalsIgnoreCase(el.getAsString().trim());
  }

  private static Double readAuthoritativeBalance(JsonObject obj) {
    Double msgNum = parseNumericElement(obj.get("message"));
    if (msgNum != null) return msgNum;
    for (String key : new String[]{"balance", "walletBalance", "amount"}) {
      Double v = parseNumericElement(obj.get(key));
      if (v != null) return v;
    }
    if (obj.has("data") && obj.get("data").isJsonObject()) {
      JsonObject data = obj.getAsJsonObject("data");
      for (String key : new String[]{"message", "balance", "walletBalance"}) {
        Double v = parseNumericElement(data.get(key));
        if (v != null) return v;
      }
    }
    return null;
  }

  private static Double parseNumericElement(JsonElement el) {
    if (el == null || el.isJsonNull() || !el.isJsonPrimitive()) return null;
    if (el.getAsJsonPrimitive().isNumber()) {
      double d = el.getAsDouble();
      return Double.isFinite(d) ? d : null;
    }
    if (el.getAsJsonPrimitive().isString()) {
      String s = el.getAsString().trim();
      if (s.isEmpty()) return null;
      try {
        double d = Double.parseDouble(s);
        return Double.isFinite(d) ? d : null;
      } catch (NumberFormatException ignored) {
        return null;
      }
    }
    return null;
  }

  private static String extractErrorMessage(JsonObject obj, String fallback) {
    for (String key : new String[]{"error", "message", "msg", "detail"}) {
      if (obj.has(key) && !obj.get(key).isJsonNull() && obj.get(key).isJsonPrimitive()) {
        String s = obj.get(key).getAsString().trim();
        if (!s.isEmpty()) return s;
      }
    }
    return fallback;
  }

  private static Map<String, Object> walletFail(String message, String errorCode, boolean sessionExpired, boolean retryable) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("success", false);
    m.put("status", false);
    m.put("message", message);
    if (errorCode != null) m.put("errorCode", errorCode);
    if (sessionExpired) m.put("sessionExpired", true);
    if (retryable) m.put("retryable", true);
    return m;
  }

  private static Map<String, Object> fail(String error) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("success", false);
    m.put("error", error);
    return m;
  }

  private static String pick(Map<String, ?> map, String... keys) {
    if (map == null) return "";
    for (String k : keys) {
      Object v = map.get(k);
      if (v != null) {
        String s = String.valueOf(v).trim();
        if (!s.isEmpty() && !"null".equalsIgnoreCase(s)) return s;
      }
    }
    return "";
  }

  private static Set<String> parsePartnerSet(String csv) {
    Set<String> set = new LinkedHashSet<>();
    if (!hasText(csv)) return set;
    for (String part : csv.split(",")) {
      String p = part.trim().toUpperCase(Locale.ROOT);
      if (!p.isEmpty()) set.add(p);
    }
    return set;
  }

  private static String normalizePartners(String csv) {
    return String.join(", ", parsePartnerSet(csv));
  }

  private static String trimTrailingSlash(String s) {
    return str(s).replaceAll("/+$", "");
  }

  private static String str(Object o) {
    return o == null ? "" : String.valueOf(o).trim();
  }

  private static String nullToEmpty(String s) {
    return s == null ? "" : s;
  }

  private static boolean hasText(String s) {
    return s != null && !s.isBlank();
  }

  private static boolean asBool(Object v) {
    if (v instanceof Boolean b) return b;
    String s = str(v).toLowerCase(Locale.ROOT);
    return "true".equals(s) || "1".equals(s) || "yes".equals(s);
  }

  private static String maskKey(String key) {
    if (!hasText(key)) return "";
    if (key.length() <= 8) return "••••••••";
    return key.substring(0, 4) + "••••" + key.substring(key.length() - 4);
  }
}
