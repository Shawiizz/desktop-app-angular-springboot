import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, catchError, of, interval, Subscription } from 'rxjs';
import { ApiService } from '../api.service';
import { AuthStoreService } from './auth-store.service';
import { GameStatus, GameSettings, GameInfo, GameState } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class MinecraftService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly apiService = inject(ApiService);
  private readonly authStore = inject(AuthStoreService);
  
  // State
  private readonly _status = signal<GameStatus>({
    state: 'NOT_INSTALLED',
    progress: 0,
    currentStep: '',
    currentFile: '',
    downloadedBytes: 0,
    totalBytes: 0
  });
  private readonly _settings = signal<GameSettings | null>(null);
  private readonly _info = signal<GameInfo | null>(null);
  private readonly _isLoading = signal(false);
  
  // Selectors
  readonly status = this._status.asReadonly();
  readonly settings = this._settings.asReadonly();
  readonly info = this._info.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  
  private pollingSubscription?: Subscription;
  
  constructor() {
    this.loadInfo();
    this.loadSettings();
  }
  
  ngOnDestroy(): void {
    this.stopPolling();
  }
  
  private getAuthHeaders(): HttpHeaders {
    const token = this.authStore.accessToken();
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }
  
  loadInfo(): void {
    this.http.get<GameInfo>(`${this.apiService.getBaseUrl()}/api/minecraft/info`)
      .pipe(catchError(() => of(null)))
      .subscribe(info => {
        if (info) {
          this._info.set(info);
          if (info.installed) {
            this._status.update(s => ({ ...s, state: info.running ? 'RUNNING' : 'READY' }));
          }
        }
      });
  }
  
  loadStatus(): void {
    this.http.get<GameStatus>(`${this.apiService.getBaseUrl()}/api/minecraft/status`)
      .pipe(catchError(() => of(null)))
      .subscribe(status => {
        if (status) {
          this._status.set(status);
        }
      });
  }
  
  loadSettings(): void {
    this.http.get<GameSettings>(`${this.apiService.getBaseUrl()}/api/minecraft/settings`)
      .pipe(catchError(() => of(null)))
      .subscribe(settings => {
        if (settings) {
          this._settings.set(settings);
        }
      });
  }
  
  updateSettings(settings: GameSettings): Observable<any> {
    return this.http.put(
      `${this.apiService.getBaseUrl()}/api/minecraft/settings`,
      settings
    ).pipe(
      tap(() => this._settings.set(settings)),
      catchError(error => of({ success: false, message: error.message }))
    );
  }
  
  install(): Observable<any> {
    this._isLoading.set(true);
    this.startPolling();
    
    return this.http.post(`${this.apiService.getBaseUrl()}/api/minecraft/install`, {})
      .pipe(
        tap(() => {
          this._status.update(s => ({ ...s, state: 'CHECKING' }));
        }),
        catchError(error => {
          this._isLoading.set(false);
          this.stopPolling();
          return of({ success: false, message: error.message });
        })
      );
  }
  
  launch(): Observable<any> {
    this._isLoading.set(true);
    
    return this.http.post(
      `${this.apiService.getBaseUrl()}/api/minecraft/launch`,
      {},
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(response => {
        this._isLoading.set(false);
        if ((response as any).success) {
          this._status.update(s => ({ ...s, state: 'LAUNCHING' }));
          this.startPolling();
        }
      }),
      catchError(error => {
        this._isLoading.set(false);
        return of({ success: false, message: error.error?.message || error.message });
      })
    );
  }
  
  stop(): Observable<any> {
    return this.http.post(`${this.apiService.getBaseUrl()}/api/minecraft/stop`, {})
      .pipe(
        tap(() => {
          this._status.update(s => ({ ...s, state: 'READY' }));
          this.stopPolling();
        }),
        catchError(error => of({ success: false, message: error.message }))
      );
  }
  
  startPolling(): void {
    this.stopPolling();
    this.pollingSubscription = interval(500).subscribe(() => {
      this.loadStatus();
      
      const state = this._status().state;
      if (state === 'READY' || state === 'ERROR' || state === 'NOT_INSTALLED') {
        this._isLoading.set(false);
        this.loadInfo();
      }
      if (state === 'READY' || state === 'ERROR') {
        this.stopPolling();
      }
    });
  }
  
  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }
  }
  
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
