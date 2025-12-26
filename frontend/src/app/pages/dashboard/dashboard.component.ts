import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { ProgressBar } from 'primeng/progressbar';
import { Toast } from 'primeng/toast';
import { Tooltip } from 'primeng/tooltip';
import { Tag } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { AuthStoreService } from '../../services/auth-store.service';
import { MinecraftService } from '../../services/minecraft.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    Button,
    ProgressBar,
    Toast,
    Tooltip,
    Tag
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    
    <div class="bg-black w-screen h-screen flex flex-col">
      <!-- Header -->
      <header class="blueGradient flex h-14 w-full items-center justify-between px-6">
        <div class="flex items-center gap-3">
          <i class="pi pi-box text-xl text-white"></i>
          <span class="font-bold text-lg text-white">MC Launcher</span>
        </div>
        
        <div class="flex items-center gap-2">
          @if (user()) {
            <span class="text-sm text-white/80 mr-2">{{ user()!.displayName }}</span>
          }
          <button 
            (click)="onSettingsClick()" 
            class="flex items-center justify-center cursor-pointer bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
            pTooltip="Settings">
            <i class="pi pi-cog text-white"></i>
          </button>
          <button 
            (click)="onLogout()" 
            class="flex items-center justify-center cursor-pointer bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
            pTooltip="Logout">
            <i class="pi pi-sign-out text-white"></i>
          </button>
        </div>
      </header>

      <!-- Main Content -->
      <main class="flex-1 flex items-center justify-center p-8">
        <div class="w-full max-w-xl">
          <!-- Game Card -->
          <div class="bg-zinc-900 rounded-lg p-8 shadow-xl">
            <!-- Header with versions -->
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center gap-3">
                <div class="w-14 h-14 rounded-xl bg-zinc-800 flex items-center justify-center">
                  <i class="pi pi-box text-2xl text-blue-400"></i>
                </div>
                <div>
                  <h1 class="text-2xl font-bold text-white">Minecraft</h1>
                  <p class="text-surface-400 text-sm">Java Edition</p>
                </div>
              </div>
              <div class="flex gap-2">
                <p-tag value="1.21.1" severity="success" [rounded]="true" />
                <p-tag value="NeoForge" severity="secondary" [rounded]="true" />
              </div>
            </div>

            <!-- Version details -->
            <div class="bg-zinc-800/50 rounded-lg p-4 mb-6">
              <div class="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p class="text-xs text-surface-500 mb-1">Minecraft</p>
                  <p class="text-white font-medium">{{ info()?.minecraftVersion || '1.21.1' }}</p>
                </div>
                <div>
                  <p class="text-xs text-surface-500 mb-1">NeoForge</p>
                  <p class="text-white font-medium">{{ info()?.neoForgeVersion || '21.1.77' }}</p>
                </div>
                <div>
                  <p class="text-xs text-surface-500 mb-1">Status</p>
                  <p [class]="statusTextClass()">{{ statusText() }}</p>
                </div>
              </div>
            </div>

            <!-- Progress Section -->
            @if (showProgress()) {
              <div class="mb-6 space-y-3">
                <div class="flex justify-between text-sm">
                  <span class="text-surface-300">{{ status().currentStep }}</span>
                  <span class="text-surface-500">{{ formatProgress() }}</span>
                </div>
                <p-progressBar [value]="status().progress" [showValue]="false" styleClass="h-2" />
              </div>
            }

            <!-- Error Message -->
            @if (status().state === 'ERROR') {
              <div class="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div class="flex items-center gap-3 text-red-400">
                  <i class="pi pi-exclamation-triangle text-xl"></i>
                  <span class="text-sm">{{ status().errorMessage || 'An error occurred' }}</span>
                </div>
              </div>
            }

            <!-- Play Button -->
            <p-button 
              [label]="buttonText()"
              [icon]="buttonIcon()"
              styleClass="w-full h-12"
              [severity]="buttonSeverity()"
              [disabled]="isButtonDisabled()"
              (onClick)="onPlayClick()"
            />
          </div>

          <!-- Stats Cards -->
          <div class="grid grid-cols-3 gap-4 mt-6">
            <div class="bg-zinc-900/80 rounded-lg p-4 text-center">
              <i class="pi pi-clock text-blue-400 text-xl mb-2"></i>
              <p class="text-xl font-semibold text-white">--</p>
              <p class="text-xs text-zinc-500">Hours played</p>
            </div>
            <div class="bg-zinc-900/80 rounded-lg p-4 text-center">
              <i class="pi pi-th-large text-blue-400 text-xl mb-2"></i>
              <p class="text-xl font-semibold text-white">0</p>
              <p class="text-xs text-zinc-500">Mods installed</p>
            </div>
            <div class="bg-zinc-900/80 rounded-lg p-4 text-center">
              <i class="pi pi-calendar text-blue-400 text-xl mb-2"></i>
              <p class="text-xl font-semibold text-white">--</p>
              <p class="text-xs text-zinc-500">Last played</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: []
})
export class DashboardComponent {
  private readonly authStore = inject(AuthStoreService);
  private readonly mcService = inject(MinecraftService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
    constructor() {
      // Fallback: si jamais le guard n'est pas appelé (navigation directe, bug Angular, etc)
      if (!this.authStore.isAuthenticated()) {
        this.router.navigate(['/login']);
      }
    }
  
  readonly user = this.authStore.user;
  readonly status = this.mcService.status;
  readonly info = this.mcService.info;
  
  readonly statusText = computed(() => {
    const state = this.status().state;
    switch (state) {
      case 'NOT_INSTALLED': return 'Not installed';
      case 'READY': return 'Ready';
      case 'RUNNING': return 'Playing';
      case 'ERROR': return 'Error';
      default: return 'Loading...';
    }
  });

  readonly statusTextClass = computed(() => {
    const state = this.status().state;
    switch (state) {
      case 'READY': return 'text-green-400 font-medium';
      case 'RUNNING': return 'text-blue-400 font-medium';
      case 'ERROR': return 'text-red-400 font-medium';
      default: return 'text-surface-400';
    }
  });
  
  readonly buttonText = computed(() => {
    const state = this.status().state;
    switch (state) {
      case 'NOT_INSTALLED': return 'Install';
      case 'CHECKING': return 'Checking...';
      case 'DOWNLOADING': return 'Downloading...';
      case 'INSTALLING': return 'Installing...';
      case 'READY': return 'Play';
      case 'LAUNCHING': return 'Launching...';
      case 'RUNNING': return 'Playing';
      case 'ERROR': return 'Retry';
      default: return 'Play';
    }
  });
  
  readonly buttonIcon = computed(() => {
    const state = this.status().state;
    switch (state) {
      case 'NOT_INSTALLED': return 'pi pi-download';
      case 'CHECKING':
      case 'DOWNLOADING':
      case 'INSTALLING':
      case 'LAUNCHING': return 'pi pi-spinner pi-spin';
      case 'READY': return 'pi pi-play';
      case 'RUNNING': return 'pi pi-stop';
      case 'ERROR': return 'pi pi-refresh';
      default: return 'pi pi-play';
    }
  });

  readonly buttonSeverity = computed((): "success" | "info" | "warn" | "danger" | "help" | "primary" | "secondary" | "contrast" | undefined => {
    const state = this.status().state;
    if (state === 'ERROR') return 'danger';
    if (state === 'READY') return 'primary';
    if (state === 'NOT_INSTALLED') return 'primary';
    return 'secondary';
  });
  
  readonly isButtonDisabled = computed(() => {
    const state = this.status().state;
    return ['CHECKING', 'DOWNLOADING', 'INSTALLING', 'LAUNCHING'].includes(state);
  });
  
  readonly showProgress = computed(() => {
    const state = this.status().state;
    return ['DOWNLOADING', 'INSTALLING'].includes(state);
  });
  
  onPlayClick(): void {
    const state = this.status().state;
    
    if (state === 'NOT_INSTALLED' || state === 'ERROR') {
      this.mcService.install().subscribe(response => {
        if ((response as any).success) {
          this.messageService.add({
            severity: 'info',
            summary: 'Installing',
            detail: 'Downloading Minecraft with NeoForge...'
          });
        }
      });
    } else if (state === 'READY') {
      this.mcService.launch().subscribe(response => {
        if ((response as any).success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Launched',
            detail: 'Have fun!'
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: (response as any).message
          });
        }
      });
    } else if (state === 'RUNNING') {
      this.mcService.stop().subscribe();
    }
  }
  
  onSettingsClick(): void {
    this.router.navigate(['/settings']);
  }
  
  onLogout(): void {
    this.authStore.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
  
  formatProgress(): string {
    const s = this.status();
    if (s.totalBytes > 0) {
      return `${this.mcService.formatBytes(s.downloadedBytes)} / ${this.mcService.formatBytes(s.totalBytes)}`;
    }
    return `${Math.round(s.progress)}%`;
  }
}
