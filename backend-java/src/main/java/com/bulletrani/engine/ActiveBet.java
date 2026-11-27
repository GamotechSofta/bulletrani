package com.bulletrani.engine;

public class ActiveBet {
  public Object id;
  public long userId;
  public String username;
  public String avatar;
  public int panelId;
  public double betAmount;
  public String status;
  public Double autoCashout;
  public boolean isBot;
  public double winAmount;
  public Double cashoutMultiplier;
  /** Provider session token — when set, settle via Provider Game SDK wallet. */
  public String sessionToken;
  /** Operations launch token & context — when set, settle via /api/v1/wallet/credit-transfer (2052). */
  public String opsToken;
  public String opsPartnerCode;
  public String opsUserId;
  public String opsGid;
  public String pendingWinTranId;
  public long lastCashoutErrorAt;
  public String debitTxId;
}
