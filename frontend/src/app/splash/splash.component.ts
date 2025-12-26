import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProgressBar } from 'primeng/progressbar';
import { ConfigService, AppConfig } from '../services/config.service';
import { ApiService } from '../api.service';
import { AuthStoreService } from '../services/auth-store.service';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [CommonModule, ProgressBar],
  template: `
    <div class="bg-black w-screen h-screen flex flex-col items-center justify-center transition-opacity duration-500"
         [class.opacity-0]="fadeOut">
      <!-- Logo -->
      <div class="mb-8">
        <div class="w-20 h-20 rounded-2xl blueGradient flex items-center justify-center shadow-lg">
          <i class="pi pi-box text-3xl text-white"></i>
        </div>
      </div>

      <!-- Title -->
      <h1 class="text-2xl font-bold text-white mb-2">MC Launcher</h1>
      <p class="text-surface-400 text-sm mb-8">{{ status }}</p>

      <!-- Progress -->
      <div class="w-64">
        <p-progressBar [value]="progress" [showValue]="false" styleClass="h-2" />
      </div>

      <!-- Version -->
      <p class="text-surface-600 text-xs mt-8">v{{ config?.version || '1.0.0' }}</p>
    </div>
  `,
  styles: []
})
export class SplashComponent implements OnInit {
  status = 'Starting...';
  fadeOut = false;
  config: AppConfig | null = null;
  progress = 0;
  
  private readonly router = inject(Router);
  private readonly configService = inject(ConfigService);
  private readonly apiService = inject(ApiService);
  private readonly authStore = inject(AuthStoreService);

  ngOnInit(): void {
    this.initializeApp();
  }

  private async initializeApp(): Promise<void> {
    this.status = 'Initializing...';
    this.progress = 10;
    
    const apiReady = await this.waitForApiWithStatus(30000, 300);
    
    if (!apiReady) {
      this.status = 'Backend failed to start';
      return;
    }
    
    this.progress = 60;
    this.status = 'Loading configuration...';
    
    try {
      this.config = await firstValueFrom(this.configService.getConfig());
    } catch {
      this.config = { name: 'Minecraft Launcher', id: 'mc-launcher', version: '1.0.0', description: '' };
    }
    
    this.progress = 80;
    await this.delay(300);
    
    this.progress = 100;
    this.status = 'Ready';
    await this.delay(500);

    this.fadeOut = true;
    await this.delay(500);
    
    if (this.authStore.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  private async waitForApiWithStatus(maxWaitMs: number, intervalMs: number): Promise<boolean> {
    const startTime = Date.now();
    let dotCount = 0;
    const isDevMode = !environment.production;
    
    while (Date.now() - startTime < maxWaitMs) {
      const port = localStorage.getItem('backend_port');
      const elapsed = Date.now() - startTime;
      this.progress = Math.min(50, Math.floor((elapsed / maxWaitMs) * 50) + 10);
      
      dotCount = (dotCount + 1) % 4;
      const dots = '.'.repeat(dotCount);
      
      if (isDevMode || port) {
        this.status = `Connecting${dots}`;
        
        const healthUrl = isDevMode && !port 
          ? '/actuator/health' 
          : `http://localhost:${port}/actuator/health`;
        
        try {
          const response = await fetch(healthUrl, {
            method: 'GET',
            signal: AbortSignal.timeout(2000)
          });
          if (response.ok) {
            if (port) {
              this.apiService.refreshBaseUrl();
            }
            return true;
          }
        } catch {
          // Keep waiting
        }
      } else {
        this.status = `Waiting${dots}`;
      }
      
      if (localStorage.getItem('backend_error') === 'true') {
        return false;
      }
      
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
