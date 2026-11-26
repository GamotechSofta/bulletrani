package com.bulletrani.store;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

public final class Models {
  private Models() {}

  @Document("users")
  public static class User {
    @Id public long id;
    @Indexed(unique = true) public String username;
    @Indexed(unique = true) public String email;
    @Field("password_hash") public String passwordHash;
    public double balance;
    public String role;
    @Field("is_banned") public int isBanned;
    @Field("created_at") public String createdAt;
  }

  @Document("game_rounds")
  public static class GameRound {
    @Id public long id;
    @Field("round_number") public long roundNumber;
    @Field("server_seed") public String serverSeed;
    @Field("client_seed") public String clientSeed;
    public String hash;
    @Field("seed_hash") public String seedHash;
    public Long nonce;
    @Field("chain_hash") public String chainHash;
    @Field("crash_multiplier") public double crashMultiplier;
    public String status;
    @Field("started_at") public String startedAt;
    @Field("crashed_at") public String crashedAt;
  }

  @Document("bets")
  public static class Bet {
    @Id public long id;
    @Field("round_id") public long roundId;
    @Field("user_id") public long userId;
    @Field("panel_id") public int panelId;
    @Field("bet_amount") public double betAmount;
    @Field("auto_cashout") public Double autoCashout;
    @Field("cashout_multiplier") public Double cashoutMultiplier;
    @Field("win_amount") public double winAmount;
    public String status;
    /** local | provider-id (e.g. dpbossking) */
    @Field("wallet_source") public String walletSource;
    @Field("provider_code") public String providerCode;
    @Field("created_at") public String createdAt;
  }

  @Document("transactions")
  public static class Tx {
    @Id public long id;
    @Field("user_id") public long userId;
    public String type;
    public double amount;
    @Field("balance_after") public double balanceAfter;
    public String description;
    @Field("created_at") public String createdAt;
  }

  @Document("system_settings")
  public static class Setting {
    @Id public String key;
    public String value;
  }

  @Document("counters")
  public static class Counter {
    @Id public String id;
    public long seq;
  }
}
