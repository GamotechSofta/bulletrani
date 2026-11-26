package com.bulletrani.provider;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.bulletrani.config.AppProperties;
import com.bulletrani.store.DataStore;
import in.oreng.gamesdk.ProviderGameServerSDK;
import in.oreng.gamesdk.ProviderSDKException;
import in.oreng.gamesdk.WalletOperationRequest;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class ProviderWalletService {
  private final AppProperties props;
  private final DataStore db;
  private volatile ProviderGameServerSDK sdk;

  public ProviderWalletService(AppProperties props, DataStore db) {
    this.props = props;
    this.db = db;
  }

  @PostConstruct
  public void loadPersisted() {
    AppProperties.Provider p = props.getProvider();
    String enabled = db.getSetting("provider_enabled", null);
    if (enabled != null) p.setEnabled("true".equalsIgnoreCase(enabled) || "1".equals(enabled));
    String apiUrl = db.getSetting("provider_api_url", null);
    if (apiUrl != null && !apiUrl.isBlank()) p.setApiUrl(apiUrl.trim());
    String apiKey = db.getSetting("provider_api_key", null);
    if (apiKey != null && !apiKey.isBlank()) p.setApiKey(apiKey.trim());
    String tableId = db.getSetting("provider_table_id", null);
    if (tableId != null && !tableId.isBlank()) p.setTableId(tableId.trim());
    String gameCode = db.getSetting("provider_game_code", null);
    if (gameCode != null && !gameCode.isBlank()) p.setGameCode(gameCode.trim());
    resetSdk();
  }

  public boolean isEnabled() {
    AppProperties.Provider p = props.getProvider();
    return p.isEnabled() && p.getApiKey() != null && !p.getApiKey().isBlank();
  }

  public String tableId() {
    return props.getProvider().getTableId();
  }

  public String gameCode() {
    return props.getProvider().getGameCode();
  }

  /** Stable id for finance grouping — derived from gateway host (e.g. dpbossking). */
  public String providerId() {
    return idFromApiUrl(props.getProvider().getApiUrl());
  }

  public String providerDisplayName() {
    String id = providerId();
    if ("dpbossking".equalsIgnoreCase(id)) return "dpbossking";
    return id;
  }

  /** Public status + masked credentials for admin / UI. */
  public Map<String, Object> getPublicConfig() {
    AppProperties.Provider p = props.getProvider();
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", providerId());
    m.put("name", providerDisplayName());
    m.put("enabled", p.isEnabled());
    m.put("active", isEnabled());
    m.put("apiUrl", p.getApiUrl());
    m.put("apiKeyConfigured", p.getApiKey() != null && !p.getApiKey().isBlank());
    m.put("apiKeyMasked", maskKey(p.getApiKey()));
    m.put("tableId", p.getTableId());
    m.put("gameCode", p.getGameCode());
    m.put("walletMode", isEnabled() ? "provider" : "local");
    return m;
  }

  static String idFromApiUrl(String apiUrl) {
    if (apiUrl == null || apiUrl.isBlank()) return "provider";
    try {
      String host = java.net.URI.create(apiUrl.trim()).getHost();
      if (host == null || host.isBlank()) return "provider";
      host = host.toLowerCase();
      if (host.startsWith("api.")) host = host.substring(4);
      int dot = host.indexOf('.');
      return dot > 0 ? host.substring(0, dot) : host;
    } catch (Exception e) {
      return "provider";
    }
  }

  /**
   * Update Provider integration from admin panel. Empty apiKey keeps the existing secret.
   */
  public synchronized Map<String, Object> updateConfig(Map<String, Object> body) {
    AppProperties.Provider p = props.getProvider();

    if (body.containsKey("enabled")) {
      p.setEnabled(asBool(body.get("enabled")));
    }
    if (body.containsKey("apiUrl")) {
      String url = String.valueOf(body.get("apiUrl")).trim();
      if (!url.isEmpty()) p.setApiUrl(url.replaceAll("/+$", ""));
    }
    if (body.containsKey("apiKey")) {
      String key = String.valueOf(body.get("apiKey")).trim();
      // Ignore masked placeholders / blanks so admins can save other fields without re-entering secret
      if (!key.isEmpty() && !key.contains("•") && !key.contains("*")) {
        p.setApiKey(key);
      }
    }
    if (body.containsKey("tableId")) {
      String tid = String.valueOf(body.get("tableId")).trim();
      if (!tid.isEmpty()) p.setTableId(tid);
    }
    if (body.containsKey("gameCode")) {
      String code = String.valueOf(body.get("gameCode")).trim().toUpperCase();
      if (!code.isEmpty()) p.setGameCode(code);
    }

    db.putSettings(Map.of(
        "provider_enabled", String.valueOf(p.isEnabled()),
        "provider_api_url", nullToEmpty(p.getApiUrl()),
        "provider_api_key", nullToEmpty(p.getApiKey()),
        "provider_table_id", nullToEmpty(p.getTableId()),
        "provider_game_code", nullToEmpty(p.getGameCode())
    ));

    resetSdk();
    return getPublicConfig();
  }

  private void resetSdk() {
    sdk = null;
  }

  private ProviderGameServerSDK sdk() {
    if (!isEnabled()) {
      throw new IllegalStateException("Provider wallet is not enabled");
    }
    if (sdk == null) {
      synchronized (this) {
        if (sdk == null) {
          sdk = new ProviderGameServerSDK(props.getProvider().getApiUrl(), props.getProvider().getApiKey());
        }
      }
    }
    return sdk;
  }

  public Double getBalance(String sessionToken) {
    JsonObject data = sdk().getBalance(sessionToken);
    return readAmount(data);
  }

  public Map<String, Object> getPlayerProfile(String sessionToken) {
    JsonObject data = sdk().getPlayerProfile(sessionToken);
    Map<String, Object> out = new LinkedHashMap<>();
    data.entrySet().forEach(e -> out.put(e.getKey(), jsonToJava(e.getValue())));
    return out;
  }

  public Map<String, Object> debit(String sessionToken, double amount, String transactionId,
                                  String roundId, String tableId) {
    try {
      JsonObject data = sdk().debit(WalletOperationRequest.builder()
          .sessionToken(sessionToken)
          .amount(amount)
          .transactionId(transactionId)
          .roundId(roundId)
          .tableId(tableId != null ? tableId : tableId())
          .build());
      return Map.of(
          "success", true,
          "balance", readAmount(data),
          "raw", data.toString()
      );
    } catch (ProviderSDKException e) {
      Map<String, Object> fail = new LinkedHashMap<>();
      fail.put("success", false);
      fail.put("message", e.getMessage());
      fail.put("status", e.getStatus());
      return fail;
    }
  }

  public Map<String, Object> credit(String sessionToken, double amount, String transactionId,
                                   String roundId, String tableId) {
    try {
      JsonObject data = sdk().credit(WalletOperationRequest.builder()
          .sessionToken(sessionToken)
          .amount(amount)
          .transactionId(transactionId)
          .roundId(roundId)
          .tableId(tableId != null ? tableId : tableId())
          .build());
      return Map.of(
          "success", true,
          "balance", readAmount(data),
          "raw", data.toString()
      );
    } catch (ProviderSDKException e) {
      Map<String, Object> fail = new LinkedHashMap<>();
      fail.put("success", false);
      fail.put("message", e.getMessage());
      fail.put("status", e.getStatus());
      return fail;
    }
  }

  public static String newTxId(String prefix) {
    return prefix + "_" + UUID.randomUUID().toString().replace("-", "");
  }

  private static String maskKey(String key) {
    if (key == null || key.isBlank()) return "";
    if (key.length() <= 8) return "••••••••";
    return key.substring(0, 4) + "••••" + key.substring(key.length() - 4);
  }

  private static boolean asBool(Object v) {
    if (v instanceof Boolean b) return b;
    String s = String.valueOf(v).trim().toLowerCase();
    return "true".equals(s) || "1".equals(s) || "yes".equals(s);
  }

  private static String nullToEmpty(String s) {
    return s == null ? "" : s;
  }

  private static Double readAmount(JsonObject data) {
    if (data == null) return null;
    for (String key : new String[]{"balance", "amount", "walletBalance", "value"}) {
      if (data.has(key) && !data.get(key).isJsonNull()) {
        try { return data.get(key).getAsDouble(); } catch (Exception ignored) {}
      }
    }
    return null;
  }

  private static Object jsonToJava(JsonElement el) {
    if (el == null || el.isJsonNull()) return null;
    if (el.isJsonPrimitive()) {
      if (el.getAsJsonPrimitive().isNumber()) return el.getAsNumber();
      if (el.getAsJsonPrimitive().isBoolean()) return el.getAsBoolean();
      return el.getAsString();
    }
    return el.toString();
  }
}
