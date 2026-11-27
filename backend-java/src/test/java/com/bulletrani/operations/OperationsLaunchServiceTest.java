package com.bulletrani.operations;

import com.bulletrani.config.AppProperties;
import com.bulletrani.security.JwtService;
import com.bulletrani.store.DataStore;
import com.bulletrani.store.Models.User;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.net.SocketTimeoutException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static java.util.Map.entry;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class OperationsLaunchServiceTest {

  private AppProperties props;
  private DataStore db;
  private JwtService jwt;
  private List<RecordedCall> recordedCalls;
  private OperationsLaunchService.HttpTransport stubTransport;
  private OperationsLaunchService service;

  private record RecordedCall(String url, String internalKey, JsonObject body) {}

  @BeforeEach
  void setUp() {
    props = new AppProperties();
    db = mock(DataStore.class);
    jwt = mock(JwtService.class);
    recordedCalls = new ArrayList<>();
    stubTransport = (url, key, json) -> {
      JsonObject parsed = JsonParser.parseString(json).getAsJsonObject();
      recordedCalls.add(new RecordedCall(url, key, parsed));
      if (url.endsWith("/api/v1/wallet/balance")) {
        return new OperationsLaunchService.TransportResponse(200, "{\"status\":true,\"message\":1250.75}");
      }
      if (url.endsWith("/api/v1/wallet/credit-transfer")) {
        return new OperationsLaunchService.TransportResponse(200, "{\"status\":true,\"message\":1265.75}");
      }
      return new OperationsLaunchService.TransportResponse(404, "{\"status\":false,\"error\":\"Not found\"}");
    };
    service = new OperationsLaunchService(props, db, jwt, stubTransport);
  }

  @Test
  void updateConfigPersistsAndMasksInternalKey() {
    Map<String, Object> cfg = service.updateConfig(Map.ofEntries(
        entry("enabled", true),
        entry("apiUrl", "https://operations.dpbossking.com/"),
        entry("internalKey", "super_secret_internal_key_1234"),
        entry("launchUrl", "https://play.example.com/game"),
        entry("gameCode", "bulletrani"),
        entry("gid", "1001"),
        entry("allowedPartnerCodes", "alpha-test, beta-partner"),
        entry("defaultCurrency", "inr"),
        entry("defaultLang", "EN"),
        entry("defaultCloseUrl", "https://lobby.example.com"),
        entry("strictParams", true),
        entry("showExitButton", true),
        entry("retryCount", 3)
    ));

    assertEquals(true, cfg.get("enabled"));
    assertEquals(true, cfg.get("active"));
    assertEquals("https://operations.dpbossking.com", cfg.get("apiUrl"));
    assertEquals(true, cfg.get("internalKeyConfigured"));
    assertEquals("supe••••1234", cfg.get("internalKeyMasked"));
    assertFalse(cfg.containsKey("internalKey"));
    assertEquals("BULLETRANI", cfg.get("gameCode"));
    assertEquals("ALPHA-TEST, BETA-PARTNER", cfg.get("allowedPartnerCodes"));
    assertEquals("INR", cfg.get("defaultCurrency"));
    assertEquals("en", cfg.get("defaultLang"));
    assertEquals(3, cfg.get("retryCount"));

    Map<String, Object> clientCfg = service.getClientBootConfig();
    assertFalse(clientCfg.containsKey("apiUrl"));
    assertFalse(clientCfg.containsKey("internalKey"));
    assertFalse(clientCfg.containsKey("internalKeyMasked"));

    @SuppressWarnings("unchecked")
    ArgumentCaptor<Map<String, ?>> cap = ArgumentCaptor.forClass(Map.class);
    verify(db).putSettings(cap.capture());
    assertEquals("super_secret_internal_key_1234", cap.getValue().get("ops_internal_key"));
    assertEquals("3", cap.getValue().get("ops_retry_count"));
  }

  @Test
  void updateConfigPreservesExistingKeyWhenBlankOrMasked() {
    service.updateConfig(Map.of("internalKey", "real_key_9999"));
    Map<String, Object> cfg = service.updateConfig(Map.of("internalKey", "real••••9999"));
    assertEquals("real••••9999", cfg.get("internalKeyMasked"));
    assertEquals("real_key_9999", props.getOperations().getInternalKey());
  }

  @Test
  void updateConfigRejectsUnsafeUrls() {
    assertThrows(IllegalArgumentException.class, () ->
        service.updateConfig(Map.of("apiUrl", "ftp://ops.example.com")));
    assertThrows(IllegalArgumentException.class, () ->
        service.updateConfig(Map.of("defaultCloseUrl", "javascript:alert(1)")));
  }

  @Test
  void bootSessionCalls2051AndIssuesJwt() {
    service.updateConfig(Map.ofEntries(
        entry("enabled", true),
        entry("apiUrl", "https://operations.dpbossking.com/api/v1"),
        entry("internalKey", "INTERNAL_SERVICE_KEY"),
        entry("gameCode", "BULLETRANI"),
        entry("gid", "1001"),
        entry("allowedPartnerCodes", "ALPHA-TEST"),
        entry("defaultCurrency", "INR"),
        entry("defaultLang", "en"),
        entry("defaultCloseUrl", "https://lobby.example.com"),
        entry("strictParams", true),
        entry("showExitButton", true)
    ));

    User opsUser = new User();
    opsUser.id = 901;
    opsUser.username = "Pilot1";
    opsUser.role = "player";
    when(db.findOrCreateOperationsUser("ALPHA-TEST", "u_99", "Pilot1")).thenReturn(opsUser);
    when(jwt.issue(opsUser)).thenReturn("signed.jwt.token");

    Map<String, Object> missingRes = service.bootSession(Map.of("token", "tok_123"), false);
    assertEquals(false, missingRes.get("success"));
    assertEquals(0, recordedCalls.size());

    Map<String, Object> badClose = service.bootSession(Map.of(
        "token", "tok_123",
        "partner_code", "alpha-test",
        "gid", "1001",
        "game_code", "BULLETRANI",
        "username", "Pilot1",
        "close_url", "javascript:alert(1)"
    ), false);
    assertEquals(false, badClose.get("success"));

    Map<String, Object> ok = service.bootSession(Map.of(
        "token", "tok_live_abcdef",
        "partner_code", "alpha-test",
        "gid", "1001",
        "game_code", "bulletrani",
        "username", "Pilot1",
        "user_id", "u_99",
        "extsess", "ext_001"
    ), false);

    assertEquals(true, ok.get("success"));
    assertEquals("signed.jwt.token", ok.get("jwt"));
    assertEquals(901L, ok.get("userId"));
    assertEquals(1250.75, ((Number) ok.get("balance")).doubleValue(), 0.001);

    RecordedCall call = recordedCalls.get(0);
    assertEquals("https://operations.dpbossking.com/api/v1/wallet/balance", call.url());
    assertEquals("INTERNAL_SERVICE_KEY", call.internalKey());
  }

  @Test
  void creditTransferRetriesWithSameTranidOnTimeout502AndErr0020() {
    service.updateConfig(Map.of(
        "enabled", true,
        "apiUrl", "https://operations.dpbossking.com",
        "internalKey", "INTERNAL_SERVICE_KEY",
        "retryCount", 2
    ));

    List<String> seenTranIds = new ArrayList<>();
    AtomicInteger callNum = new AtomicInteger(0);
    OperationsLaunchService retrying = new OperationsLaunchService(props, db, jwt, (url, key, json) -> {
      JsonObject body = JsonParser.parseString(json).getAsJsonObject();
      seenTranIds.add(body.get("tranid").getAsString());
      int n = callNum.incrementAndGet();
      if (n == 1) throw new SocketTimeoutException("read timed out");
      if (n == 2) return new OperationsLaunchService.TransportResponse(502, "{\"status\":false,\"code\":\"ERR-0021\",\"error\":\"Bad gateway\"}");
      return new OperationsLaunchService.TransportResponse(200, "{\"status\":true,\"message\":500.25}");
    });

    Map<String, Object> res = retrying.creditTransfer2052(
        "tok_1", "ALPHA-TEST", "u_99", "1001",
        10.0, 25.0, "spin", 1, "rnd8841", "1001-rnd8841-1");
    assertEquals(true, res.get("success"));
    assertEquals(3, res.get("attempts"));
    assertEquals(500.25, ((Number) res.get("balance")).doubleValue(), 0.001);
    assertEquals(List.of("1001-rnd8841-1", "1001-rnd8841-1", "1001-rnd8841-1"), seenTranIds);
  }

  @Test
  void creditTransferDoesNotRetryOn400BusinessRefusalOrSessionExpired() {
    service.updateConfig(Map.of(
        "enabled", true,
        "apiUrl", "https://operations.dpbossking.com",
        "internalKey", "INTERNAL_SERVICE_KEY",
        "retryCount", 2
    ));

    AtomicInteger refusalCalls = new AtomicInteger(0);
    OperationsLaunchService refusal = new OperationsLaunchService(props, db, jwt, (url, key, json) -> {
      refusalCalls.incrementAndGet();
      return new OperationsLaunchService.TransportResponse(400, "{\"status\":false,\"message\":\"Insufficient balance\"}");
    });
    Map<String, Object> bad400 = refusal.creditTransfer2052(
        "tok", "ALPHA-TEST", "1001", 50.0, 0.0, "spin", 1, "rnd8842", "1001-rnd8842-1");
    assertEquals(false, bad400.get("success"));
    assertEquals(1, refusalCalls.get());
    assertNull(bad400.get("sessionExpired"));

    AtomicInteger expiredCalls = new AtomicInteger(0);
    OperationsLaunchService expired = new OperationsLaunchService(props, db, jwt, (url, key, json) -> {
      expiredCalls.incrementAndGet();
      return new OperationsLaunchService.TransportResponse(401, "{\"status\":false,\"code\":\"ERR-0011\",\"message\":\"Session expired\"}");
    });
    Map<String, Object> expRes = expired.creditTransfer2052(
        "tok", "ALPHA-TEST", "1001", 50.0, 0.0, "spin", 1, "rnd8843", "1001-rnd8843-1");
    assertEquals(false, expRes.get("success"));
    assertEquals(true, expRes.get("sessionExpired"));
    assertEquals("ERR-0011", expRes.get("errorCode"));
    assertEquals(1, expiredCalls.get());
  }

  @Test
  void lateWinCanSettleUsingPartnerCodeAndUserIdWithoutToken() {
    service.updateConfig(Map.of(
        "enabled", true,
        "apiUrl", "https://operations.dpbossking.com",
        "internalKey", "INTERNAL_SERVICE_KEY"
    ));

    Map<String, Object> lateWin = service.creditTransfer2052(
        null, "alpha-test", "u_99", "1001",
        0.0, 75.0, "spin", 1, "rnd8844", "1001-rnd8844-1-win");
    assertEquals(true, lateWin.get("success"));
    RecordedCall call = recordedCalls.get(0);
    assertFalse(call.body().has("token"));
    assertEquals("ALPHA-TEST", call.body().get("partner_code").getAsString());
    assertEquals("u_99", call.body().get("user_id").getAsString());
    assertEquals(75.0, call.body().get("win").getAsDouble(), 0.001);
  }
}
