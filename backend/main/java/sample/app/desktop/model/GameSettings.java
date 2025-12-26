package sample.app.desktop.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameSettings {
    @Builder.Default
    private int minRamMb = 2048;
    @Builder.Default
    private int maxRamMb = 4096;
    @Builder.Default
    private String gameDirectory = "";
    @Builder.Default
    private boolean fullscreen = false;
    @Builder.Default
    private int screenWidth = 1280;
    @Builder.Default
    private int screenHeight = 720;
    @Builder.Default
    private String javaPath = "";
    @Builder.Default
    private String additionalArgs = "";
}
