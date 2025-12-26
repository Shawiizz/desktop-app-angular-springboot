package sample.app.desktop.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import sample.app.desktop.model.LoginRequest;
import sample.app.desktop.model.LoginResponse;
import sample.app.desktop.model.User;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Mock Authentication Service
 * In production, this would connect to Microsoft/Mojang authentication
 */
@Slf4j
@Service
public class AuthService {
    
    // Mock user database
    private static final Map<String, String> MOCK_USERS = Map.of(
        "player", "password",
        "admin", "admin123",
        "test", "test"
    );
    
    // Active sessions
    private final Map<String, User> activeSessions = new ConcurrentHashMap<>();
    
    public LoginResponse login(LoginRequest request) {
        log.info("Login attempt for user: {}", request.getUsername());
        
        String username = request.getUsername();
        String password = request.getPassword();
        
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            return LoginResponse.builder()
                .success(false)
                .message("Username and password are required")
                .build();
        }
        
        // Check mock credentials
        String expectedPassword = MOCK_USERS.get(username.toLowerCase());
        if (expectedPassword == null || !expectedPassword.equals(password)) {
            log.warn("Failed login attempt for user: {}", username);
            return LoginResponse.builder()
                .success(false)
                .message("Invalid username or password")
                .build();
        }
        
        // Create user session
        String accessToken = UUID.randomUUID().toString();
        User user = User.builder()
            .id(UUID.randomUUID().toString())
            .username(username.toLowerCase())
            .displayName(capitalizeFirst(username))
            .avatarUrl("https://mc-heads.net/avatar/" + username + "/100")
            .accessToken(accessToken)
            .build();
        
        activeSessions.put(accessToken, user);
        log.info("User {} logged in successfully", username);
        
        return LoginResponse.builder()
            .success(true)
            .message("Login successful")
            .user(user)
            .build();
    }
    
    public boolean logout(String accessToken) {
        if (accessToken != null && activeSessions.containsKey(accessToken)) {
            User user = activeSessions.remove(accessToken);
            log.info("User {} logged out", user.getUsername());
            return true;
        }
        return false;
    }
    
    public Optional<User> validateSession(String accessToken) {
        if (accessToken == null || accessToken.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(activeSessions.get(accessToken));
    }
    
    public Optional<User> getCurrentUser(String accessToken) {
        return validateSession(accessToken);
    }
    
    private String capitalizeFirst(String str) {
        if (str == null || str.isEmpty()) return str;
        return str.substring(0, 1).toUpperCase() + str.substring(1).toLowerCase();
    }
}
