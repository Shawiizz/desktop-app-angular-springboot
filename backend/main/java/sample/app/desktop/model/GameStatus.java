package sample.app.desktop.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameStatus {
    private GameState state;
    private double progress;
    private String currentStep;
    private String currentFile;
    private long downloadedBytes;
    private long totalBytes;
    private String errorMessage;
    
    public enum GameState {
        NOT_INSTALLED,
        CHECKING,
        DOWNLOADING,
        INSTALLING,
        READY,
        LAUNCHING,
        RUNNING,
        ERROR
    }
}
