package sample.app.desktop.service;

import fr.flowarg.flowupdater.FlowUpdater;
import fr.flowarg.flowupdater.download.DownloadList;
import fr.flowarg.flowupdater.download.IProgressCallback;
import fr.flowarg.flowupdater.download.Step;
import fr.flowarg.flowupdater.versions.VanillaVersion;
import fr.flowarg.flowupdater.versions.neoforge.NeoForgeVersion;
import fr.flowarg.flowupdater.versions.neoforge.NeoForgeVersionBuilder;
import fr.flowarg.openlauncherlib.NoFramework;
import fr.theshark34.openlauncherlib.JavaUtil;
import fr.theshark34.openlauncherlib.minecraft.AuthInfos;
import fr.theshark34.openlauncherlib.minecraft.GameFolder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import sample.app.desktop.config.AppConfigService;
import sample.app.desktop.model.GameSettings;
import sample.app.desktop.model.GameStatus;
import sample.app.desktop.model.GameStatus.GameState;
import sample.app.desktop.model.User;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.file.*;
import java.util.Arrays;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicReference;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Slf4j
@Service
public class MinecraftService {
    
    private static final String MINECRAFT_VERSION = "1.21.1";
    private static final String NEOFORGE_VERSION = "21.1.77"; // Latest stable for 1.21.1
    
    // Adoptium Temurin JDK 21 for Windows x64
    private static final String JDK_URL = "https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.5%2B11/OpenJDK21U-jdk_x64_windows_hotspot_21.0.5_11.zip";
    private static final String JDK_FOLDER_NAME = "jdk-21.0.5+11";
    
    private final AppConfigService appConfigService;
    private final SimpMessagingTemplate messagingTemplate;
    
    private final AtomicReference<GameStatus> currentStatus = new AtomicReference<>(
        GameStatus.builder().state(GameState.NOT_INSTALLED).build()
    );
    
    private GameSettings settings = GameSettings.builder().build();
    private Process gameProcess = null;
    
    public MinecraftService(AppConfigService appConfigService, SimpMessagingTemplate messagingTemplate) {
        this.appConfigService = appConfigService;
        this.messagingTemplate = messagingTemplate;
        initializeGameDirectory();
        checkInitialInstallationStatus();
    }
    
    private void checkInitialInstallationStatus() {
        if (isGameInstalled()) {
            log.info("Minecraft {} with NeoForge {} is already installed", MINECRAFT_VERSION, NEOFORGE_VERSION);
            currentStatus.set(GameStatus.builder()
                .state(GameState.READY)
                .progress(100)
                .currentStep("Game ready to play")
                .build());
        } else {
            log.info("Minecraft not installed yet");
        }
    }
    
    private void initializeGameDirectory() {
        if (settings.getGameDirectory() == null || settings.getGameDirectory().isBlank()) {
            String appDataDir = appConfigService.getAppDataPath();
            settings.setGameDirectory(Paths.get(appDataDir, "minecraft").toString());
        }
    }
    
    /**
     * Get the path to the Java executable, downloading JDK if necessary
     */
    private Path getJavaExecutable() throws IOException {
        String appDataDir = appConfigService.getAppDataPath();
        Path javaDir = Paths.get(appDataDir, "java");
        Path jdkDir = javaDir.resolve(JDK_FOLDER_NAME);
        Path javaExe = jdkDir.resolve("bin").resolve("java.exe");
        
        if (Files.exists(javaExe)) {
            log.info("Using existing Java installation: {}", javaExe);
            return javaExe;
        }
        
        // Need to download JDK
        log.info("Java not found, downloading Adoptium Temurin JDK 21...");
        Files.createDirectories(javaDir);
        
        Path zipFile = javaDir.resolve("jdk.zip");
        downloadJdk(zipFile);
        extractZip(zipFile, javaDir);
        Files.deleteIfExists(zipFile);
        
        if (!Files.exists(javaExe)) {
            throw new IOException("Java executable not found after extraction: " + javaExe);
        }
        
        log.info("Java installed successfully: {}", javaExe);
        return javaExe;
    }
    
    private void downloadJdk(Path destination) throws IOException {
        updateStatus(GameState.DOWNLOADING, 0, "Downloading Java Runtime...", "", 0, 0);
        
        URL url = new URL(JDK_URL);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setRequestProperty("User-Agent", "Mozilla/5.0");
        connection.setInstanceFollowRedirects(true);
        
        // Handle GitHub redirects
        int status = connection.getResponseCode();
        if (status == HttpURLConnection.HTTP_MOVED_TEMP || status == HttpURLConnection.HTTP_MOVED_PERM) {
            String newUrl = connection.getHeaderField("Location");
            connection = (HttpURLConnection) new URL(newUrl).openConnection();
            connection.setRequestProperty("User-Agent", "Mozilla/5.0");
        }
        
        long totalBytes = connection.getContentLengthLong();
        log.info("Downloading JDK ({} MB)...", totalBytes / 1024 / 1024);
        
        try (InputStream in = connection.getInputStream();
             OutputStream out = Files.newOutputStream(destination)) {
            
            byte[] buffer = new byte[8192];
            long downloadedBytes = 0;
            int bytesRead;
            
            while ((bytesRead = in.read(buffer)) != -1) {
                out.write(buffer, 0, bytesRead);
                downloadedBytes += bytesRead;
                
                double progress = totalBytes > 0 ? (double) downloadedBytes / totalBytes * 100 : 0;
                updateStatus(GameState.DOWNLOADING, progress, "Downloading Java Runtime...", 
                    "", downloadedBytes, totalBytes);
            }
        }
        
        log.info("JDK download complete");
    }
    
    private void extractZip(Path zipFile, Path destDir) throws IOException {
        updateStatus(GameState.INSTALLING, 0, "Extracting Java Runtime...", "", 0, 0);
        log.info("Extracting JDK to {}", destDir);
        
        try (ZipInputStream zis = new ZipInputStream(Files.newInputStream(zipFile))) {
            ZipEntry entry;
            byte[] buffer = new byte[8192];
            
            while ((entry = zis.getNextEntry()) != null) {
                Path entryPath = destDir.resolve(entry.getName()).normalize();
                
                // Security check - prevent zip slip
                if (!entryPath.startsWith(destDir)) {
                    throw new IOException("Bad zip entry: " + entry.getName());
                }
                
                if (entry.isDirectory()) {
                    Files.createDirectories(entryPath);
                } else {
                    Files.createDirectories(entryPath.getParent());
                    try (OutputStream out = Files.newOutputStream(entryPath)) {
                        int len;
                        while ((len = zis.read(buffer)) > 0) {
                            out.write(buffer, 0, len);
                        }
                    }
                }
                zis.closeEntry();
            }
        }
        
        log.info("JDK extraction complete");
    }

    public GameStatus getStatus() {
        GameStatus status = currentStatus.get();
        // If status shows NOT_INSTALLED but game is actually installed, update it
        if (status.getState() == GameState.NOT_INSTALLED && isGameInstalled()) {
            GameStatus readyStatus = GameStatus.builder()
                .state(GameState.READY)
                .progress(100)
                .currentStep("Game ready to play")
                .build();
            currentStatus.set(readyStatus);
            return readyStatus;
        }
        return status;
    }
    
    public GameSettings getSettings() {
        return settings;
    }
    
    public void updateSettings(GameSettings newSettings) {
        this.settings = newSettings;
        log.info("Game settings updated: {}", settings);
    }
    
    public CompletableFuture<Void> installGame() {
        return CompletableFuture.runAsync(() -> {
            try {
                updateStatus(GameState.CHECKING, 0, "Checking installation...", "", 0, 0);
                
                Path gameDir = Paths.get(settings.getGameDirectory());
                Files.createDirectories(gameDir);
                
                log.info("Starting Minecraft {} with NeoForge {} installation to {}", 
                    MINECRAFT_VERSION, NEOFORGE_VERSION, gameDir);
                
                // Create progress callback
                IProgressCallback progressCallback = new IProgressCallback() {
                    @Override
                    public void step(Step step) {
                        String stepName = getStepName(step);
                        updateStatus(GameState.DOWNLOADING, currentStatus.get().getProgress(), 
                            stepName, "", 0, 0);
                        log.info("Step: {}", stepName);
                    }
                    
                    @Override
                    public void update(DownloadList.DownloadInfo info) {
                        long downloaded = info.getDownloadedBytes();
                        long total = info.getTotalToDownloadBytes();
                        double progress = total > 0 ? (double) downloaded / total * 100 : 0;
                        
                        updateStatus(GameState.DOWNLOADING, progress, 
                            currentStatus.get().getCurrentStep(),
                            info.getDownloadedFiles() + " files",
                            downloaded, total);
                    }
                };
                
                // Build Vanilla version
                VanillaVersion vanillaVersion = new VanillaVersion.VanillaVersionBuilder()
                    .withName(MINECRAFT_VERSION)
                    .build();
                
                // Build NeoForge version
                NeoForgeVersion neoForgeVersion = new NeoForgeVersionBuilder()
                    .withNeoForgeVersion(NEOFORGE_VERSION)
                    .build();
                
                // Build and run FlowUpdater
                FlowUpdater updater = new FlowUpdater.FlowUpdaterBuilder()
                    .withVanillaVersion(vanillaVersion)
                    .withModLoaderVersion(neoForgeVersion)
                    .withProgressCallback(progressCallback)
                    .build();
                
                updateStatus(GameState.INSTALLING, 0, "Installing Minecraft...", "", 0, 0);
                updater.update(gameDir);
                
                updateStatus(GameState.READY, 100, "Installation complete!", "", 0, 0);
                log.info("Minecraft installation completed successfully");
                
            } catch (Exception e) {
                log.error("Failed to install Minecraft", e);
                updateStatus(GameState.ERROR, 0, "Installation failed", "", 0, 0);
                currentStatus.get().setErrorMessage(e.getMessage());
                broadcastStatus();
            }
        });
    }
    
    public CompletableFuture<Boolean> launchGame(User user) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                if (currentStatus.get().getState() == GameState.RUNNING) {
                    log.warn("Game is already running");
                    return false;
                }
                
                updateStatus(GameState.LAUNCHING, 0, "Preparing Java Runtime...", "", 0, 0);
                
                // Get or download Java
                Path javaExe = getJavaExecutable();
                log.info("Using Java: {}", javaExe);
                
                updateStatus(GameState.LAUNCHING, 20, "Launching game...", "", 0, 0);
                
                Path gameDir = Paths.get(settings.getGameDirectory());
                
                // Create AuthInfos for NoFramework
                AuthInfos authInfos = new AuthInfos(
                    user.getDisplayName(),
                    user.getAccessToken(),
                    user.getId()
                );
                
                // Create NoFramework launcher - uses GameFolder.FLOW_UPDATER for correct directory structure
                NoFramework noFramework = new NoFramework(
                    gameDir,
                    authInfos,
                    GameFolder.FLOW_UPDATER
                );
                
                // Set custom Java path globally for OpenLauncherLib
                String javaCommand = "\"" + javaExe.toAbsolutePath().toString() + "\"";
                JavaUtil.setJavaCommand(javaCommand);
                log.info("JavaUtil configured with custom Java: {}", javaCommand);
                
                // Configure JVM arguments
                noFramework.getAdditionalVmArgs().addAll(Arrays.asList(
                    "-Xms" + settings.getMinRamMb() + "M",
                    "-Xmx" + settings.getMaxRamMb() + "M"
                ));
                
                // Add resolution/fullscreen arguments
                if (!settings.isFullscreen()) {
                    noFramework.getAdditionalArgs().addAll(Arrays.asList(
                        "--width", String.valueOf(settings.getScreenWidth()),
                        "--height", String.valueOf(settings.getScreenHeight())
                    ));
                } else {
                    noFramework.getAdditionalArgs().add("--fullscreen");
                }
                
                log.info("Launching Minecraft {} with NeoForge {} for user {}", 
                    MINECRAFT_VERSION, NEOFORGE_VERSION, user.getDisplayName());
                log.info("Game directory: {}", gameDir);
                log.info("JVM args: -Xms{}M -Xmx{}M", settings.getMinRamMb(), settings.getMaxRamMb());
                
                updateStatus(GameState.LAUNCHING, 50, "Starting Minecraft...", "", 0, 0);
                
                log.info("Calling noFramework.launch()...");
                
                // Launch with NeoForge
                try {
                    gameProcess = noFramework.launch(
                        MINECRAFT_VERSION,
                        NEOFORGE_VERSION,
                        NoFramework.ModLoader.NEO_FORGE
                    );
                } catch (Throwable t) {
                    log.error("Exception during noFramework.launch(): ", t);
                    throw t;
                }
                
                log.info("noFramework.launch() returned successfully");
                
                if (gameProcess == null) {
                    log.error("Game process is null after launch!");
                    updateStatus(GameState.ERROR, 0, "Launch failed: process is null", "", 0, 0);
                    return false;
                }
                
                log.info("Game process started, PID: {}", gameProcess.pid());
                log.info("Process alive: {}", gameProcess.isAlive());
                
                // Monitor game process
                monitorGameProcess();
                
                updateStatus(GameState.RUNNING, 100, "Game is running", "", 0, 0);
                return true;
                
            } catch (Throwable e) {
                log.error("Failed to launch game", e);
                updateStatus(GameState.ERROR, 0, "Launch failed: " + e.getMessage(), "", 0, 0);
                currentStatus.get().setErrorMessage(e.getMessage());
                broadcastStatus();
                return false;
            }
        });
    }
    
    private void monitorGameProcess() {
        // Thread for stdout
        Thread stdoutMonitor = new Thread(() -> {
            try {
                BufferedReader reader = new BufferedReader(
                    new InputStreamReader(gameProcess.getInputStream()));
                String line;
                while ((line = reader.readLine()) != null) {
                    log.info("[Minecraft] {}", line);
                }
            } catch (Exception e) {
                log.error("Error reading game stdout", e);
            }
        }, "GameStdoutMonitor");
        stdoutMonitor.setDaemon(true);
        stdoutMonitor.start();
        
        // Thread for stderr
        Thread stderrMonitor = new Thread(() -> {
            try {
                BufferedReader reader = new BufferedReader(
                    new InputStreamReader(gameProcess.getErrorStream()));
                String line;
                while ((line = reader.readLine()) != null) {
                    log.warn("[Minecraft-ERR] {}", line);
                }
            } catch (Exception e) {
                log.error("Error reading game stderr", e);
            }
        }, "GameStderrMonitor");
        stderrMonitor.setDaemon(true);
        stderrMonitor.start();
        
        // Thread to wait for process exit
        Thread exitMonitor = new Thread(() -> {
            try {
                int exitCode = gameProcess.waitFor();
                log.info("Minecraft exited with code: {}", exitCode);
                
                if (exitCode != 0) {
                    updateStatus(GameState.ERROR, 0, "Game crashed with exit code: " + exitCode, "", 0, 0);
                } else {
                    updateStatus(GameState.READY, 100, "Game closed", "", 0, 0);
                }
                gameProcess = null;
                
            } catch (Exception e) {
                log.error("Error waiting for game process", e);
            }
        }, "GameExitMonitor");
        exitMonitor.setDaemon(true);
        exitMonitor.start();
    }
    
    public boolean isGameRunning() {
        return gameProcess != null && gameProcess.isAlive();
    }
    
    public void stopGame() {
        if (gameProcess != null && gameProcess.isAlive()) {
            log.info("Stopping game process");
            gameProcess.destroy();
            gameProcess = null;
            updateStatus(GameState.READY, 100, "Game stopped", "", 0, 0);
        }
    }
    
    public boolean isGameInstalled() {
        try {
            Path gameDir = Paths.get(settings.getGameDirectory());
            Path librariesDir = gameDir.resolve("libraries");
            Path assetsDir = gameDir.resolve("assets");
            Path neoforgeJson = gameDir.resolve("neoforge-" + NEOFORGE_VERSION + ".json");
            Path clientJar = gameDir.resolve("client.jar");
            
            // Check that essential files/directories exist (FlowUpdater structure)
            boolean librariesExist = Files.exists(librariesDir) && Files.isDirectory(librariesDir);
            boolean assetsExist = Files.exists(assetsDir) && Files.isDirectory(assetsDir);
            boolean neoforgeExists = Files.exists(neoforgeJson);
            boolean clientExists = Files.exists(clientJar);
            
            boolean installed = librariesExist && assetsExist && neoforgeExists && clientExists;
            log.debug("Installation check - libraries: {}, assets: {}, neoforge: {}, client: {} => {}", 
                librariesExist, assetsExist, neoforgeExists, clientExists, installed);
            
            return installed;
        } catch (Exception e) {
            log.error("Error checking installation status", e);
            return false;
        }
    }
    
    private void updateStatus(GameState state, double progress, String step, String file, 
                             long downloaded, long total) {
        GameStatus status = GameStatus.builder()
            .state(state)
            .progress(progress)
            .currentStep(step)
            .currentFile(file)
            .downloadedBytes(downloaded)
            .totalBytes(total)
            .build();
        
        currentStatus.set(status);
        broadcastStatus();
    }
    
    private void broadcastStatus() {
        try {
            messagingTemplate.convertAndSend("/topic/game-status", currentStatus.get());
        } catch (Exception e) {
            log.debug("Failed to broadcast status (no subscribers?): {}", e.getMessage());
        }
    }
    
    private String getStepName(Step step) {
        return switch (step) {
            case READ -> "Reading version info...";
            case DL_LIBS -> "Downloading libraries...";
            case DL_ASSETS -> "Downloading assets...";
            case EXTRACT_NATIVES -> "Extracting natives...";
            case MOD_LOADER -> "Installing NeoForge...";
            case MODS -> "Downloading mods...";
            case EXTERNAL_FILES -> "Downloading external files...";
            case POST_EXECUTIONS -> "Running post-installation tasks...";
            case END -> "Installation complete!";
            case INTEGRATION -> "Loading integration...";
            case MOD_PACK -> "Preparing mod pack...";
        };
    }
    
    public String getMinecraftVersion() {
        return MINECRAFT_VERSION;
    }
    
    public String getNeoForgeVersion() {
        return NEOFORGE_VERSION;
    }
}
