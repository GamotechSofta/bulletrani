package com.bulletrani.fair;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;

public final class ProvablyFair {
  private ProvablyFair() {}

  public static String generateServerSeed() {
    byte[] bytes = new byte[32];
    new SecureRandom().nextBytes(bytes);
    return HexFormat.of().formatHex(bytes);
  }

  public static String hashSeed(String serverSeed) {
    try {
      MessageDigest md = MessageDigest.getInstance("SHA-256");
      return HexFormat.of().formatHex(md.digest(serverSeed.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  public static String hmacMessage(String clientSeed, long nonce) {
    return clientSeed + ":" + nonce;
  }

  public static Map<String, Object> calculateMultiplier(String serverSeed, String clientSeed,
                                                         double houseEdgePercent, long nonce) {
    String message = hmacMessage(clientSeed, nonce);
    String hash = hmacSha256(serverSeed, message);
    String subHash = hash.substring(0, 13);
    BigInteger intVal = new BigInteger(subHash, 16);
    double floatVal = intVal.doubleValue() / Math.pow(2, 52);
    double houseEdge = houseEdgePercent / 100.0;

    Map<String, Object> out = new LinkedHashMap<>();
    out.put("hash", hash);
    out.put("message", message);
    out.put("nonce", nonce);

    if (floatVal < houseEdge) {
      out.put("multiplier", 1.00);
      return out;
    }
    double raw = (1.0 - houseEdge) / (1.0 - floatVal);
    double multiplier = Math.max(1.01, Math.floor(raw * 100.0) / 100.0);
    out.put("multiplier", multiplier);
    return out;
  }

  public static String chainHash(String prevChainHash, String seedHash, long nonce) {
    String payload = (prevChainHash == null ? "GENESIS" : prevChainHash) + ":" + seedHash + ":" + nonce;
    return hashSeed(payload);
  }

  public static Map<String, Object> verifyRound(String serverSeed, String clientSeed,
                                                 double houseEdgePercent, long nonce, String expectedSeedHash) {
    Map<String, Object> calc = calculateMultiplier(serverSeed, clientSeed, houseEdgePercent, nonce);
    String publicHash = hashSeed(serverSeed);
    boolean seedHashMatches = expectedSeedHash == null
        || expectedSeedHash.isBlank()
        || publicHash.equalsIgnoreCase(expectedSeedHash);

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("serverSeed", serverSeed);
    result.put("clientSeed", clientSeed);
    result.put("nonce", nonce);
    result.put("message", calc.get("message"));
    result.put("publicHash", publicHash);
    result.put("calculatedHash", calc.get("hash"));
    result.put("multiplier", calc.get("multiplier"));
    result.put("seedHashMatches", seedHashMatches);
    result.put("valid", seedHashMatches);
    return result;
  }

  public static Map<String, Object> verifyChainLink(String prevChainHash, String seedHash,
                                                     long nonce, String expectedChainHash) {
    String calculated = chainHash(prevChainHash, seedHash, nonce);
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("calculated", calculated);
    result.put("expected", expectedChainHash);
    result.put("valid", calculated.equals(expectedChainHash));
    return result;
  }

  private static String hmacSha256(String key, String message) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      return HexFormat.of().formatHex(mac.doFinal(message.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }
}
