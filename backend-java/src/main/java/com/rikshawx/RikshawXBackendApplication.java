package com.rikshawx;

import com.rikshawx.config.AppProperties;
import com.rikshawx.security.SecurityBootstrap;
import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(AppProperties.class)
public class RikshawXBackendApplication {
  public static void main(String[] args) {
    loadDotEnv();
    SecurityBootstrap.assertSecureOrDie();
    SpringApplication.run(RikshawXBackendApplication.class, args);
  }

  /** Load backend-java/.env into system properties so ${ENV} placeholders resolve. */
  private static void loadDotEnv() {
    try {
      Dotenv dotenv = Dotenv.configure()
          .directory("./")
          .ignoreIfMissing()
          .ignoreIfMalformed()
          .load();
      dotenv.entries().forEach(entry -> {
        String key = entry.getKey();
        if (System.getenv(key) == null && System.getProperty(key) == null) {
          System.setProperty(key, entry.getValue());
        }
      });
    } catch (Exception e) {
      System.err.println("Warning: could not load .env — " + e.getMessage());
    }
  }
}
