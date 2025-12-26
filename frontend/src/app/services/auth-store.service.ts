import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { ApiService } from '../api.service';
import { User, LoginRequest, LoginResponse } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class AuthStoreService {
  private readonly http = inject(HttpClient);
  private readonly apiService = inject(ApiService);
  
  // State
  private readonly _user = signal<User | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);
  
  // Selectors
  readonly user = this._user.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly accessToken = computed(() => this._user()?.accessToken ?? null);
  
  constructor() {
    this.loadStoredSession();
  }
  
  private loadStoredSession(): void {
    const storedUser = localStorage.getItem('mc_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser) as User;
        this._user.set(user);
        this.validateSession();
      } catch {
        localStorage.removeItem('mc_user');
      }
    }
  }
  
  private getAuthHeaders(): HttpHeaders {
    const token = this._user()?.accessToken;
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }
  
  login(credentials: LoginRequest): Observable<LoginResponse> {
    this._isLoading.set(true);
    this._error.set(null);
    
    return this.http.post<LoginResponse>(
      `${this.apiService.getBaseUrl()}/api/auth/login`,
      credentials
    ).pipe(
      tap(response => {
        this._isLoading.set(false);
        if (response.success && response.user) {
          this._user.set(response.user);
          localStorage.setItem('mc_user', JSON.stringify(response.user));
        } else {
          this._error.set(response.message);
        }
      }),
      catchError(error => {
        this._isLoading.set(false);
        this._error.set(error.error?.message || 'Login failed');
        return of({ success: false, message: error.error?.message || 'Login failed' });
      })
    );
  }
  
  logout(): Observable<any> {
    return this.http.post(
      `${this.apiService.getBaseUrl()}/api/auth/logout`,
      {},
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(() => {
        this._user.set(null);
        localStorage.removeItem('mc_user');
      }),
      catchError(() => {
        this._user.set(null);
        localStorage.removeItem('mc_user');
        return of({ success: true });
      })
    );
  }
  
  private validateSession(): void {
    this.http.get<{ valid: boolean }>(
      `${this.apiService.getBaseUrl()}/api/auth/validate`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(() => of({ valid: false }))
    ).subscribe(response => {
      if (!response.valid) {
        this._user.set(null);
        localStorage.removeItem('mc_user');
      }
    });
  }
  
  clearError(): void {
    this._error.set(null);
  }
}
