package com.rikshawx.socket;

import com.corundumstudio.socketio.Configuration;
import com.corundumstudio.socketio.SocketIOServer;
import com.rikshawx.config.AppProperties;
import com.rikshawx.engine.GameBroadcaster;
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
    // Socket.IO origin check is coarse (single value). Keep * for LAN/dev;
    // bets/admin room require JWT on connect. HTTP CORS is allowlisted separately.
    cfg.setOrigin("*");
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
