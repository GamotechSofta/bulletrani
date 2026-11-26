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
}
