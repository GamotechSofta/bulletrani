package com.bulletrani.engine;

import com.bulletrani.config.AppProperties;
import com.bulletrani.operations.OperationsLaunchService;
import com.bulletrani.provider.ProviderWalletService;
import com.bulletrani.security.JwtService;
import com.bulletrani.store.DataStore;
import com.bulletrani.store.Models.Bet;
import com.bulletrani.store.Models.GameRound;
import com.bulletrani.store.Models.User;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CrashEngineOperationsTest {

  private DataStore db;
  private GameBroadcaster bus;
  private ProviderWalletService provider;
  private OperationsLaunchService operations;
  private CrashEngine engine;
  private final List<JsonObject> transfers = new ArrayList<>();
  private final AtomicInteger nextHttpStatus = new AtomicInteger(200);
  private String nextFailBody = null;
  private double serverBalance = 1000.0;

  @BeforeEach
  void setUp() throws Exception {
    AppProperties props = new AppProperties();
    db = mock(DataStore.class);
    bus = mock(GameBroadcaster.class);
    provider = mock(ProviderWalletService.class);
    JwtService jwt = mock(JwtService.class);

    OperationsLaunchService.HttpTransport transport = (url, key, json) -> {
      JsonObject body = JsonParser.parseString(json).getAsJsonObject();
      if (url.endsWith("/api/v1/wallet/balance")) {
        return new OperationsLaunchService.TransportResponse(200, "{\"status\":true,\"message\":" + serverBalance + "}");
      }
      transfers.add(body);
      if (nextFailBody != null) {
        String errBody = nextFailBody;
        int st = nextHttpStatus.getAndSet(200);
        nextFailBody = null;
        return new OperationsLaunchService.TransportResponse(st, errBody);
      }
      if ("refund".equals(body.get("game_type").getAsString())) {
        // Refund (ttype=2) returns the reversed bet amount back to player balance
        serverBalance = serverBalance + body.get("bet").getAsDouble();
      } else {
        serverBalance = serverBalance - body.get("bet").getAsDouble() + body.get("win").getAsDouble();
      }
      return new OperationsLaunchService.TransportResponse(200, "{\"status\":true,\"message\":" + serverBalance + "}");
    };

    var ctor = OperationsLaunchService.class.getDeclaredConstructor(
        AppProperties.class, DataStore.class, JwtService.class, OperationsLaunchService.HttpTransport.class);
    ctor.setAccessible(true);
    operations = ctor.newInstance(props, db, jwt, transport);
    operations.updateConfig(Map.of(
        "enabled", true,
        "apiUrl", "https://operations.dpbossking.com",
        "internalKey", "INTERNAL_KEY",
        "gameCode", "BULLETRANI",
        "defaultCloseUrl", "https://lobby.example.com",
        "strictParams", true
    ));

    User u = new User();
    u.id = 55;
    u.username = "OpsPilot";
    u.role = "player";
    u.isBanned = 0;
    when(db.findOrCreateOperationsUser("ALPHA-TEST", "p55", "OpsPilot")).thenReturn(u);
    when(db.findById(55)).thenReturn(u);
    when(jwt.issue(u)).thenReturn("jwt-55");

    when(db.maxRoundNumber()).thenReturn(8840L);
    when(db.getSettingDouble("house_edge", 3.0)).thenReturn(3.0);
    when(db.getSettingDouble("countdown_seconds", 5.0)).thenReturn(10.0);
    when(db.getSettingDouble("min_bet", 10)).thenReturn(10.0);
    when(db.getSettingDouble("max_bet", 10000)).thenReturn(10000.0);
    when(db.getSettingDouble("max_round_stake", 0)).thenReturn(0.0);
    when(db.getSettingDouble("max_crash_multiplier", 20.0)).thenReturn(20.0);
    when(db.getSettingDouble("max_payout", 1000000)).thenReturn(1000000.0);

    GameRound gr = new GameRound();
    gr.id = 10L;
    gr.roundNumber = 8841L;
    when(db.insertRound(anyLong(), anyString(), anyString(), anyString(), anyString(), anyLong(), anyString(), anyDouble()))
        .thenReturn(gr);

    Bet savedBet = new Bet();
    savedBet.id = 777L;
    when(db.insertBet(anyLong(), anyLong(), anyInt(), anyDouble(), any(), anyString(), any())).thenReturn(savedBet);

    engine = new CrashEngine(db, bus, provider, operations);
    engine.prepareNewRound();
  }

  @AfterEach
  void tearDown() {
    engine.shutdown();
  }

  @Test
  void cancelAbortRefundAndCashoutRetryFollowPlaybook() throws Exception {
    operations.bootSession(Map.of(
        "token", "tok_ops_55",
        "partner_code", "ALPHA-TEST",
        "gid", "1001",
        "game_code", "BULLETRANI",
        "username", "OpsPilot",
        "user_id", "p55"
    ), false);

    // 1) Place bet -> spin bet=100, win=0, ttype=1
    Map<String, Object> placed = engine.placeBet(55, 1, 100.0, null, null, "tok_ops_55");
    assertEquals(true, placed.get("success"));
    assertEquals(900.0, ((Number) placed.get("newBalance")).doubleValue(), 0.001);

    // 2) Cancel bet -> refund ttype=2 with bet=100, win=0 (matches guide refund example)
    Map<String, Object> cancelled = engine.cancelBet(55, 1, null, "tok_ops_55");
    assertEquals(true, cancelled.get("success"));
    assertEquals(1000.0, ((Number) cancelled.get("newBalance")).doubleValue(), 0.001);
    JsonObject cancelReq = transfers.get(1);
    assertEquals("refund", cancelReq.get("game_type").getAsString());
    assertEquals(2, cancelReq.get("ttype").getAsInt());
    assertEquals(100.0, cancelReq.get("bet").getAsDouble(), 0.001);
    assertEquals(0.0, cancelReq.get("win").getAsDouble(), 0.001);

    // 3) Place bet then trigger ERR-0011 session expired on panel 2 -> emits operations:session_expired, does not mutate bet state
    nextHttpStatus.set(401);
    nextFailBody = "{\"status\":false,\"code\":\"ERR-0011\",\"message\":\"Session expired\"}";
    Map<String, Object> expiredBet = engine.placeBet(55, 2, 25.0, null, null, "tok_ops_55");
    assertEquals(false, expiredBet.get("success"));
    assertEquals(true, expiredBet.get("sessionExpired"));
    assertEquals("https://lobby.example.com", expiredBet.get("closeUrl"));
    verify(bus, times(1)).emitToUser(eq(55L), eq("operations:session_expired"), any());

    // 4) Place bet on panel 1, launch flight, fail cashout once then succeed -> must reuse exact same pendingWinTranId
    Map<String, Object> placed2 = engine.placeBet(55, 1, 50.0, null, null, "tok_ops_55");
    assertEquals(true, placed2.get("success"));
    String debitTranId = transfers.get(transfers.size() - 1).get("tranid").getAsString();
    engine.setCurrentCrashTarget(10.0);
    engine.launchFlight();

    Field multField = CrashEngine.class.getDeclaredField("currentMultiplier");
    multField.setAccessible(true);
    multField.set(engine, 2.0);

    nextHttpStatus.set(400);
    nextFailBody = "{\"status\":false,\"message\":\"Temporary refusal\"}";
    Map<String, Object> failedCashout = engine.cashoutBet("55_1");
    assertEquals(false, failedCashout.get("success"));
    String failedCashoutTranId = transfers.get(transfers.size() - 1).get("tranid").getAsString();
    verify(bus, never()).emit(eq("round:cashout"), any());

    Map<String, Object> okCashout = engine.cashoutBet("55_1");
    assertEquals(true, okCashout.get("success"));
    String okCashoutTranId = transfers.get(transfers.size() - 1).get("tranid").getAsString();
    assertEquals(failedCashoutTranId, okCashoutTranId);
    assertNotEquals(debitTranId, okCashoutTranId);
    assertEquals(1050.0, ((Number) okCashout.get("newBalance")).doubleValue(), 0.001);
    assertEquals("p55", transfers.get(transfers.size() - 1).get("user_id").getAsString());
    verify(bus, times(1)).emit(eq("round:cashout"), any());

    // 5) Prepare fresh round, place bet, abort round -> issues unique refund tranid with game_type=refund, ttype=2
    engine.prepareNewRound();
    Map<String, Object> placed3 = engine.placeBet(55, 1, 40.0, null, null, "tok_ops_55");
    assertEquals(true, placed3.get("success"));
    String debit3TranId = transfers.get(transfers.size() - 1).get("tranid").getAsString();

    Map<String, Object> aborted = engine.abortCurrentRound("Engine crash");
    assertEquals(true, aborted.get("success"));
    assertEquals(1, aborted.get("refundedCount"));
    JsonObject abortRefundReq = transfers.get(transfers.size() - 1);
    assertEquals("refund", abortRefundReq.get("game_type").getAsString());
    assertEquals(2, abortRefundReq.get("ttype").getAsInt());
    assertEquals(40.0, abortRefundReq.get("bet").getAsDouble(), 0.001);
    assertEquals(0.0, abortRefundReq.get("win").getAsDouble(), 0.001);
    assertNotEquals(debit3TranId, abortRefundReq.get("tranid").getAsString());
    verify(bus, times(1)).emit(eq("round:aborted"), any());
  }
}
