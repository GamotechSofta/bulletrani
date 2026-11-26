package com.bulletrani.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
  private final AppProperties props;

  public WebConfig(AppProperties props) {
    this.props = props;
  }

  /** HTTP CORS allowlist from {@code CORS_ORIGINS} in backend-java/.env. */
  @Override
  public void addCorsMappings(CorsRegistry registry) {
    String[] patterns = CorsOriginMatcher.parse(props.getCorsOrigins()).toArray(String[]::new);

    registry.addMapping("/**")
        .allowedOriginPatterns(patterns)
        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
        .allowedHeaders("*")
        .allowCredentials(false)
        .maxAge(3600);
  }
}
