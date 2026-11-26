package com.bulletrani.socket;

import com.corundumstudio.socketio.AuthorizationResult;
import com.corundumstudio.socketio.Configuration;
import com.corundumstudio.socketio.SocketIOServer;
import com.bulletrani.config.AppProperties;
import com.bulletrani.config.CorsOriginMatcher;
import com.bulletrani.engine.GameBroadcaster;
import jakarta.annotation.PreDestroy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

@Component
@Primary
public class SocketIOConfig implements GameBroadcaster {
  private final SocketIOServer server;

  public SocketIOConfig(AppProperties props) {
    Configuration cfg = new Configuration();
    cfg.setHostname(props.getSocketHost());
    cfg.setPort(props.getSocketPort());
    // Library origin field is a single string; enforce the full CORS_ORIGINS
    // allowlist from .env via AuthorizationListener (same patterns as HTTP).
    cfg.setOrigin("*");
    String corsOrigins = props.getCorsOrigins();
    cfg.setAuthorizationListener(data -> {
      String origin = data.getHttpHeaders().get("Origin");
      return CorsOriginMatcher.isAllowed(origin, corsOrigins)
          ? AuthorizationResult.SUCCESSFUL_AUTHORIZATION
          : AuthorizationResult.FAILED_AUTHORIZATION;
    });
    System.out.println("🔒 Socket.IO CORS from CORS_ORIGINS: " + CorsOriginMatcher.parse(corsOrigins));
    this.server = new SocketIOServer(cfg);
  }

  @Bean
  public SocketIOServer socketIOServer() {
    return server;
  }

  private volatile boolean started = false;

  public synchronized void startServer() {
    if (started) return;
    server.start();
    started = true;
    System.out.println("✈️ Socket.IO on http://localhost:" + server.getConfiguration().getPort());
  }

  @PreDestroy
  public void stop() {
    try { server.stop(); } catch (Exception ignored) {}
  }

  @Override
  public void emit(String event, Object data) {
    server.getBroadcastOperations().sendEvent(event, data);
  }

  @Override
  public void emitToUser(long userId, String event, Object data) {
    server.getRoomOperations("user_" + userId).sendEvent(event, data);
  }

  @Override
  public void emitToAdmins(String event, Object data) {
    server.getRoomOperations("admins").sendEvent(event, data);
  }
}
