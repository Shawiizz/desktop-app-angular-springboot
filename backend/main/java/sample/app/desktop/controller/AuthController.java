package sample.app.desktop.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import sample.app.desktop.model.LoginRequest;
import sample.app.desktop.model.LoginResponse;
import sample.app.desktop.model.User;
import sample.app.desktop.service.AuthService;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AuthController {
    
    private final AuthService authService;
    
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.status(401).body(response);
    }
    
    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        boolean success = authService.logout(token);
        
        return ResponseEntity.ok(Map.of(
            "success", success,
            "message", success ? "Logged out successfully" : "No active session"
        ));
    }
    
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        
        return authService.getCurrentUser(token)
            .map(user -> ResponseEntity.ok(Map.of("success", true, "user", user)))
            .orElse(ResponseEntity.status(401).body(Map.of(
                "success", false,
                "message", "Not authenticated"
            )));
    }
    
    @GetMapping("/validate")
    public ResponseEntity<Map<String, Object>> validateSession(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        boolean valid = authService.validateSession(token).isPresent();
        
        return ResponseEntity.ok(Map.of(
            "valid", valid,
            "message", valid ? "Session is valid" : "Session is invalid or expired"
        ));
    }
    
    private String extractToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return authHeader;
    }
}
