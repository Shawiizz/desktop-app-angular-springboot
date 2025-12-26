export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  accessToken: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: User;
}

export interface GameStatus {
  state: GameState;
  progress: number;
  currentStep: string;
  currentFile: string;
  downloadedBytes: number;
  totalBytes: number;
  errorMessage?: string;
}

export type GameState = 
  | 'NOT_INSTALLED'
  | 'CHECKING'
  | 'DOWNLOADING'
  | 'INSTALLING'
  | 'READY'
  | 'LAUNCHING'
  | 'RUNNING'
  | 'ERROR';

export interface GameSettings {
  minRamMb: number;
  maxRamMb: number;
  gameDirectory: string;
  fullscreen: boolean;
  screenWidth: number;
  screenHeight: number;
  javaPath: string;
  additionalArgs: string;
}

export interface GameInfo {
  minecraftVersion: string;
  neoForgeVersion: string;
  installed: boolean;
  running: boolean;
}
