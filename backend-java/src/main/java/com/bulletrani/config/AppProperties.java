package com.bulletrani.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "bulletrani")
public class AppProperties {
  /** Required via JWT_SECRET — no weak default. */
  private String jwtSecret = "";
  private int jwtDays = 7;
  private String socketHost = "0.0.0.0";
  private int socketPort = 5001;
  /** Comma-separated origin patterns for CORS (Spring OriginPattern syntax). */
  private String corsOrigins = "http://localhost:*,http://127.0.0.1:*,http://192.168.*.*:*,http://10.*.*.*:*";
  private final Provider provider = new Provider();
  private final Operations operations = new Operations();
  private final Mongodb mongodb = new Mongodb();

  public String getJwtSecret() { return jwtSecret; }
  public void setJwtSecret(String jwtSecret) { this.jwtSecret = jwtSecret; }
  public int getJwtDays() { return jwtDays; }
  public void setJwtDays(int jwtDays) { this.jwtDays = jwtDays; }
  public String getSocketHost() { return socketHost; }
  public void setSocketHost(String socketHost) { this.socketHost = socketHost; }
  public int getSocketPort() { return socketPort; }
  public void setSocketPort(int socketPort) { this.socketPort = socketPort; }
  public String getCorsOrigins() { return corsOrigins; }
  public void setCorsOrigins(String corsOrigins) { this.corsOrigins = corsOrigins; }
  public Provider getProvider() { return provider; }
  public Operations getOperations() { return operations; }
  public Mongodb getMongodb() { return mongodb; }

  public static class Mongodb {
    private String uri = "";
    private String database = "bullet_rani";

    public String getUri() { return uri; }
    public void setUri(String uri) { this.uri = uri; }
    public String getDatabase() { return database; }
    public void setDatabase(String database) { this.database = database; }
  }

  public static class Provider {
    /** When true, bets debit/credit via Provider Game SDK instead of local wallet. */
    private boolean enabled = false;
    private String apiUrl = "https://api.dpbossking.com/api/v1";
    private String apiKey = "";
    private String tableId = "bulletrani_main";
    /** Must match admin panel game `code` / launch `gameCode`. */
    private String gameCode = "BULLETRANI";

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getApiUrl() { return apiUrl; }
    public void setApiUrl(String apiUrl) { this.apiUrl = apiUrl; }
    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }
    public String getTableId() { return tableId; }
    public void setTableId(String tableId) { this.tableId = tableId; }
    public String getGameCode() { return gameCode; }
    public void setGameCode(String gameCode) { this.gameCode = gameCode; }
  }

  public static class Operations {
    /** When true, accepts Operations HTTP 302 launch parameters (?token=...&partner_code=...). */
    private boolean enabled = false;
    /** Operations backend base URL for server-to-server /api/v1/wallet/* calls. */
    private String apiUrl = "https://operations.dpbossking.com";
    /** Secret X-Internal-Key header sent server-to-server only (never sent to browser). */
    private String internalKey = "";
    /** Registered game launchUrl where Operations redirects players. */
    private String launchUrl = "";
    /** Catalog game_code expected on launch. */
    private String gameCode = "BULLETRANI";
    /** Optional expected game ID (gid); blank accepts any non-empty gid. */
    private String gid = "";
    /** Comma-separated uppercase partner_code allowlist; blank allows any partner_code. */
    private String allowedPartnerCodes = "";
    /** Fallback 3-letter ISO currency code when currency query param is omitted. */
    private String defaultCurrency = "INR";
    /** Fallback lowercase language code when lang query param is omitted. */
    private String defaultLang = "en";
    /** Fallback lobby URL when close_url query param is omitted. */
    private String defaultCloseUrl = "";
    /** Require all Always Sent params (token, partner_code, gid, game_code, username). */
    private boolean strictParams = true;
    /** Show Home / Exit lobby button in game HUD when close_url is available. */
    private boolean showExitButton = true;
    /** Idempotent retry attempts (same tranid) on timeout / 502 / ERR-0020 / ERR-0021. */
    private int retryCount = 2;

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getApiUrl() { return apiUrl; }
    public void setApiUrl(String apiUrl) { this.apiUrl = apiUrl; }
    public String getInternalKey() { return internalKey; }
    public void setInternalKey(String internalKey) { this.internalKey = internalKey; }
    public String getLaunchUrl() { return launchUrl; }
    public void setLaunchUrl(String launchUrl) { this.launchUrl = launchUrl; }
    public String getGameCode() { return gameCode; }
    public void setGameCode(String gameCode) { this.gameCode = gameCode; }
    public String getGid() { return gid; }
    public void setGid(String gid) { this.gid = gid; }
    public String getAllowedPartnerCodes() { return allowedPartnerCodes; }
    public void setAllowedPartnerCodes(String allowedPartnerCodes) { this.allowedPartnerCodes = allowedPartnerCodes; }
    public String getDefaultCurrency() { return defaultCurrency; }
    public void setDefaultCurrency(String defaultCurrency) { this.defaultCurrency = defaultCurrency; }
    public String getDefaultLang() { return defaultLang; }
    public void setDefaultLang(String defaultLang) { this.defaultLang = defaultLang; }
    public String getDefaultCloseUrl() { return defaultCloseUrl; }
    public void setDefaultCloseUrl(String defaultCloseUrl) { this.defaultCloseUrl = defaultCloseUrl; }
    public boolean isStrictParams() { return strictParams; }
    public void setStrictParams(boolean strictParams) { this.strictParams = strictParams; }
    public boolean isShowExitButton() { return showExitButton; }
    public void setShowExitButton(boolean showExitButton) { this.showExitButton = showExitButton; }
    public int getRetryCount() { return retryCount; }
    public void setRetryCount(int retryCount) { this.retryCount = Math.max(0, Math.min(5, retryCount)); }
  }
}
