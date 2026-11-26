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
  public String debitTxId;
}
