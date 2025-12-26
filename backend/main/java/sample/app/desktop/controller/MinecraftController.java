package sample.app.desktop.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import sample.app.desktop.model.GameSettings;
import sample.app.desktop.model.GameStatus;
import sample.app.desktop.model.User;
import sample.app.desktop.service.AuthService;
import sample.app.desktop.service.MinecraftService;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/minecraft")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class MinecraftController {
    
    private final MinecraftService minecraftService;
    private final AuthService authService;
    
    @GetMapping("/status")
    public ResponseEntity<GameStatus> getStatus() {
        return ResponseEntity.ok(minecraftService.getStatus());
    }
    
    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> getInfo() {
        return ResponseEntity.ok(Map.of(
            "minecraftVersion", minecraftService.getMinecraftVersion(),
            "neoForgeVersion", minecraftService.getNeoForgeVersion(),
            "installed", minecraftService.isGameInstalled(),
            "running", minecraftService.isGameRunning()
        ));
    }
    
    @PostMapping("/install")
    public ResponseEntity<Map<String, Object>> installGame() {
        if (minecraftService.isGameRunning()) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Cannot install while game is running"
            ));
        }
        
        minecraftService.installGame();
        
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Installation started"
        ));
    }
    
    @PostMapping("/launch")
    public ResponseEntity<Map<String, Object>> launchGame(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        
        String token = extractToken(authHeader);
        var userOpt = authService.validateSession(token);
        
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of(
                "success", false,
                "message", "Not authenticated"
            ));
        }
        
        if (minecraftService.isGameRunning()) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Game is already running"
            ));
        }
        
        if (!minecraftService.isGameInstalled()) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Game is not installed"
            ));
        }
        
        User user = userOpt.get();
        minecraftService.launchGame(user)
            .exceptionally(throwable -> {
                log.error("Game launch failed with exception", throwable);
                return false;
            });
        
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Game launch initiated"
        ));
    }
    
    @PostMapping("/stop")
    public ResponseEntity<Map<String, Object>> stopGame() {
        if (!minecraftService.isGameRunning()) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Game is not running"
            ));
        }
        
        minecraftService.stopGame();
        
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Game stopped"
        ));
    }
    
    @GetMapping("/settings")
    public ResponseEntity<GameSettings> getSettings() {
        return ResponseEntity.ok(minecraftService.getSettings());
    }
    
    @PutMapping("/settings")
    public ResponseEntity<Map<String, Object>> updateSettings(@RequestBody GameSettings settings) {
        minecraftService.updateSettings(settings);
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Settings updated"
        ));
    }
    
    private String extractToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return authHeader;
    }
}
