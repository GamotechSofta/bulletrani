package com.rikshawx.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;

@Configuration
public class WebConfig implements WebMvcConfigurer {
  private final AppProperties props;

  public WebConfig(AppProperties props) {
    this.props = props;
  }

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    String raw = props.getCorsOrigins();
    String[] patterns = Arrays.stream((raw == null || raw.isBlank()
            ? "http://localhost:*"
            : raw).split(","))
        .map(String::trim)
        .filter(s -> !s.isEmpty())
        .toArray(String[]::new);

    registry.addMapping("/**")
        .allowedOriginPatterns(patterns)
        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
        .allowedHeaders("*")
        .allowCredentials(false)
        .maxAge(3600);
  }
}
