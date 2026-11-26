package com.bulletrani.engine;

public interface GameBroadcaster {
  void emit(String event, Object data);
  void emitToUser(long userId, String event, Object data);
  /** Admin-only room — never broadcast crashTarget / serverSeed to the public. */
  void emitToAdmins(String event, Object data);
}
