package com.bulletrani.security;

import org.springframework.stereotype.Component;

import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Simple in-memory login/register throttle + temporary lockout per IP.
 */
@Component
public class AuthRateLimiter {
  private static final int MAX_ATTEMPTS = 8;
  private static final long WINDOW_MS = 15 * 60 * 1000L;
  private static final long LOCKOUT_MS = 15 * 60 * 1000L;

  private static final class Bucket {
    int failures;
    long windowStart;
    long lockedUntil;
  }

  private final Map<String, Bucket> byIp = new ConcurrentHashMap<>();

  public synchronized String check(String ip) {
    prune();
    String key = normalize(ip);
    Bucket b = byIp.computeIfAbsent(key, k -> new Bucket());
    long now = System.currentTimeMillis();
    if (b.lockedUntil > now) {
      long secs = (b.lockedUntil - now + 999) / 1000;
      return "Too many attempts. Try again in " + secs + "s";
    }
    if (now - b.windowStart > WINDOW_MS) {
      b.windowStart = now;
      b.failures = 0;
    }
    return null;
  }

  public synchronized void recordFailure(String ip) {
    String key = normalize(ip);
    Bucket b = byIp.computeIfAbsent(key, k -> new Bucket());
    long now = System.currentTimeMillis();
    if (now - b.windowStart > WINDOW_MS) {
      b.windowStart = now;
      b.failures = 0;
    }
    b.failures++;
    if (b.failures >= MAX_ATTEMPTS) {
      b.lockedUntil = now + LOCKOUT_MS;
      b.failures = 0;
      b.windowStart = now;
    }
  }

  public synchronized void recordSuccess(String ip) {
    byIp.remove(normalize(ip));
  }

  private void prune() {
    long now = System.currentTimeMillis();
    Iterator<Map.Entry<String, Bucket>> it = byIp.entrySet().iterator();
    while (it.hasNext()) {
      Bucket b = it.next().getValue();
      if (b.lockedUntil < now && now - b.windowStart > WINDOW_MS && b.failures == 0) {
        it.remove();
      }
    }
  }

  private static String normalize(String ip) {
    return ip == null || ip.isBlank() ? "unknown" : ip.trim();
  }
}
