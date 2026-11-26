package com.bulletrani.socket;

import com.corundumstudio.socketio.HandshakeData;
import com.corundumstudio.socketio.SocketIOClient;
import com.corundumstudio.socketio.SocketIOServer;
import com.bulletrani.engine.CrashEngine;
import com.bulletrani.security.JwtService;
import com.bulletrani.store.DataStore;
import com.bulletrani.store.Models.User;
import io.jsonwebtoken.Claims;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class SocketEventHandlers {
  private final SocketIOServer server;
  private final SocketIOConfig socketIOConfig;
  private final CrashEngine engine;
  private final JwtService jwt;
  private final DataStore db;

  public SocketEventHandlers(SocketIOServer server, SocketIOConfig socketIOConfig, CrashEngine engine,
                             JwtService jwt, DataStore db) {
    this.server = server;
    this.socketIOConfig = socketIOConfig;
    this.engine = engine;
    this.jwt = jwt;
    this.db = db;
  }

  @PostConstruct
  public void register() {
    server.addConnectListener(this::onConnect);

    server.addEventListener("game:init", Map.class, (client, data, ack) -> {
      Long userId = authedUserId(client);
      if (userId != null) {
        client.joinRoom("user_" + userId);
      }
      client.sendEvent("game:snapshot", engine.getSnapshot(userId));
    });

    server.addEventListener("bet:place", Map.class, (client, data, ack) -> {
      Long userId = requireUser(client, ack);
      if (userId == null) return;
      try {
        int panelId = Integer.parseInt(String.valueOf(data.get("panelId")));
        double amount = Double.parseDouble(String.valueOf(data.get("amount")));
        Double auto = data.get("autoCashout") == null || "null".equals(String.valueOf(data.get("autoCashout")))
            ? null : Double.parseDouble(String.valueOf(data.get("autoCashout")));
        String sessionToken = readSessionToken(data);
        Map<String, Object> result = engine.placeBet(userId, panelId, amount, auto, sessionToken);
        if (ack.isAckRequested()) ack.sendAckData(result);
      } catch (Exception e) {
        if (ack.isAckRequested()) {
          ack.sendAckData(Map.of("success", false, "message", "Invalid bet payload"));
        }
      }
    });

    server.addEventListener("bet:cancel", Map.class, (client, data, ack) -> {
      Long userId = requireUser(client, ack);
      if (userId == null) return;
      try {
        int panelId = Integer.parseInt(String.valueOf(data.get("panelId")));
        String sessionToken = readSessionToken(data);
        Map<String, Object> result = engine.cancelBet(userId, panelId, sessionToken);
        if (ack.isAckRequested()) ack.sendAckData(result);
      } catch (Exception e) {
        if (ack.isAckRequested()) {
          ack.sendAckData(Map.of("success", false, "message", "Invalid cancel payload"));
        }
      }
    });

    server.addEventListener("bet:cashout", Map.class, (client, data, ack) -> {
      Long userId = requireUser(client, ack);
      if (userId == null) return;
      try {
        int panelId = Integer.parseInt(String.valueOf(data.get("panelId")));
        Map<String, Object> result = engine.cashoutBet(userId + "_" + panelId);
        if (ack.isAckRequested()) ack.sendAckData(result);
      } catch (Exception e) {
        if (ack.isAckRequested()) {
          ack.sendAckData(Map.of("success", false, "message", "Invalid cashout payload"));
        }
      }
    });

    server.addEventListener("chat:message", Map.class, (client, data, ack) -> {
      Long userId = authedUserId(client);
      if (userId == null || data == null || data.get("message") == null) return;
      User user = db.findById(userId);
      if (user == null || user.isBanned != 0) return;
      String msg = String.valueOf(data.get("message")).trim();
      if (msg.isEmpty()) return;
      if (msg.length() > 120) msg = msg.substring(0, 120);
      Map<String, Object> out = new LinkedHashMap<>();
      out.put("id", System.currentTimeMillis() + Math.random());
      out.put("username", user.username);
      out.put("userId", userId);
      out.put("avatar", data.getOrDefault("avatar", "🧑‍✈️"));
      out.put("message", msg);
      out.put("timestamp", LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm")));
      server.getBroadcastOperations().sendEvent("chat:broadcast", out);
    });

    socketIOConfig.startServer();
  }

  private void onConnect(SocketIOClient client) {
    String token = extractToken(client.getHandshakeData());
    if (token == null || token.isBlank()) return;
    try {
      Claims claims = jwt.parse(token);
      long userId = ((Number) claims.get("id")).longValue();
      User user = db.findById(userId);
      if (user == null || user.isBanned != 0) return;
      // Live role from DB (not stale JWT claim)
      client.set("userId", userId);
      client.set("role", user.role);
      client.set("username", user.username);
      client.joinRoom("user_" + userId);
      if ("admin".equals(user.role)) {
        client.joinRoom("admins");
      }
    } catch (Exception ignored) {
      // Spectators may connect without a valid token
    }
  }

  private static String extractToken(HandshakeData data) {
    if (data == null) return null;
    String q = data.getSingleUrlParam("token");
    if (q != null && !q.isBlank() && !"null".equalsIgnoreCase(q)) return q.trim();
    if (data.getHttpHeaders() != null) {
      String h = data.getHttpHeaders().get("Authorization");
      if (h != null && h.regionMatches(true, 0, "Bearer ", 0, 7)) {
        return h.substring(7).trim();
      }
    }
    return null;
  }

  private static Long authedUserId(SocketIOClient client) {
    Object v = client.get("userId");
    if (v instanceof Number n) return n.longValue();
    if (v instanceof String s && !s.isBlank()) {
      try { return Long.parseLong(s); } catch (NumberFormatException ignored) { return null; }
    }
    return null;
  }

  private Long requireUser(SocketIOClient client, com.corundumstudio.socketio.AckRequest ack) {
    Long userId = authedUserId(client);
    if (userId == null) {
      if (ack != null && ack.isAckRequested()) {
        ack.sendAckData(Map.of("success", false, "message", "Unauthorized — login required"));
      }
      return null;
    }
    return userId;
  }

  private static String readSessionToken(Map data) {
    if (data == null || data.get("sessionToken") == null) return null;
    String t = String.valueOf(data.get("sessionToken"));
    if (t.isBlank() || "null".equalsIgnoreCase(t)) return null;
    return t;
  }
}
