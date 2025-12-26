import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { Slider } from 'primeng/slider';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Button } from 'primeng/button';
import { Toast } from 'primeng/toast';
import { Divider } from 'primeng/divider';
import { MessageService } from 'primeng/api';
import { MinecraftService } from '../../services/minecraft.service';
import { GameSettings } from '../../models/models';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputText,
    InputNumber,
    Slider,
    ToggleSwitch,
    Button,
    Toast,
    Divider
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    
    <div class="bg-black w-screen h-screen flex flex-col">
      <!-- Header -->
      <header class="blueGradient flex h-14 w-full items-center justify-between px-6">
        <div class="flex items-center gap-3">
          <button 
            (click)="onBack()" 
            class="flex items-center justify-center cursor-pointer bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors">
            <i class="pi pi-arrow-left text-white"></i>
          </button>
          <span class="font-bold text-lg text-white">Settings</span>
        </div>
        
        <p-button 
          label="Save" 
          icon="pi pi-check" 
          severity="contrast"
          (onClick)="onSave()"
        />
      </header>

      <!-- Content -->
      <main class="flex-1 overflow-y-auto p-6">
        <div class="max-w-2xl mx-auto space-y-6">
          <!-- Game Info -->
          <section class="bg-zinc-900 rounded-lg p-6">
            <h2 class="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
              <i class="pi pi-info-circle text-blue-400"></i>
              Game Information
            </h2>
            <div class="grid grid-cols-3 gap-4">
              <div class="bg-zinc-800/50 rounded-lg p-3 text-center">
                <p class="text-xs text-surface-500 mb-1">Minecraft</p>
                <p class="text-white font-medium">{{ info()?.minecraftVersion || '1.21.1' }}</p>
              </div>
              <div class="bg-zinc-800/50 rounded-lg p-3 text-center">
                <p class="text-xs text-zinc-500 mb-1">NeoForge</p>
                <p class="text-white font-medium">{{ info()?.neoForgeVersion || '21.1.77' }}</p>
              </div>
              <div class="bg-zinc-800/50 rounded-lg p-3 text-center">
                <p class="text-xs text-zinc-500 mb-1">Status</p>
                <p [class]="info()?.installed ? 'text-green-400 font-medium' : 'text-zinc-400'">
                  {{ info()?.installed ? 'Installed' : 'Not Installed' }}
                </p>
              </div>
            </div>
          </section>

          <!-- Memory -->
          <section class="bg-zinc-900 rounded-lg p-6">
            <h2 class="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
              <i class="pi pi-microchip text-blue-400"></i>
              Memory Allocation
            </h2>
            <div class="space-y-6">
              <div>
                <div class="flex justify-between mb-3">
                  <label class="text-sm text-zinc-300">Minimum RAM</label>
                  <span class="text-sm text-blue-400 font-medium">{{ formatRam(settings().minRamMb) }}</span>
                </div>
                <p-slider 
                  [ngModel]="settings().minRamMb"
                  (ngModelChange)="updateSetting('minRamMb', $event)"
                  [min]="512"
                  [max]="8192"
                  [step]="512"
                  styleClass="w-full"
                />
              </div>
              <div>
                <div class="flex justify-between mb-3">
                  <label class="text-sm text-zinc-300">Maximum RAM</label>
                  <span class="text-sm text-blue-400 font-medium">{{ formatRam(settings().maxRamMb) }}</span>
                </div>
                <p-slider 
                  [ngModel]="settings().maxRamMb"
                  (ngModelChange)="updateSetting('maxRamMb', $event)"
                  [min]="1024"
                  [max]="16384"
                  [step]="512"
                  styleClass="w-full"
                />
              </div>
            </div>
          </section>

          <!-- Display -->
          <section class="bg-zinc-900 rounded-lg p-6">
            <h2 class="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
              <i class="pi pi-desktop text-blue-400"></i>
              Display Settings
            </h2>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <label class="text-sm text-zinc-300">Fullscreen Mode</label>
                <p-toggleSwitch 
                  [ngModel]="settings().fullscreen"
                  (ngModelChange)="updateSetting('fullscreen', $event)"
                />
              </div>
              
              @if (!settings().fullscreen) {
                <p-divider />
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="text-sm text-zinc-300 block mb-2">Width</label>
                    <p-inputNumber 
                      [ngModel]="settings().screenWidth"
                      (ngModelChange)="updateSetting('screenWidth', $event)"
                      [min]="800"
                      [max]="3840"
                      suffix=" px"
                      styleClass="w-full"
                    />
                  </div>
                  <div>
                    <label class="text-sm text-zinc-300 block mb-2">Height</label>
                    <p-inputNumber 
                      [ngModel]="settings().screenHeight"
                      (ngModelChange)="updateSetting('screenHeight', $event)"
                      [min]="600"
                      [max]="2160"
                      suffix=" px"
                      styleClass="w-full"
                    />
                  </div>
                </div>
              }
            </div>
          </section>

          <!-- Advanced -->
          <section class="bg-zinc-900 rounded-lg p-6">
            <h2 class="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
              <i class="pi pi-cog text-blue-400"></i>
              Advanced Settings
            </h2>
            <div class="space-y-4">
              <div>
                <label class="text-sm text-zinc-300 block mb-2">Game Directory</label>
                <input 
                  pInputText
                  [ngModel]="settings().gameDirectory"
                  (ngModelChange)="updateSetting('gameDirectory', $event)"
                  placeholder="Default location"
                  class="w-full"
                />
              </div>
              <div>
                <label class="text-sm text-zinc-300 block mb-2">Java Path</label>
                <input 
                  pInputText
                  [ngModel]="settings().javaPath"
                  (ngModelChange)="updateSetting('javaPath', $event)"
                  placeholder="Auto-detect"
                  class="w-full"
                />
              </div>
              <div>
                <label class="text-sm text-zinc-300 block mb-2">JVM Arguments</label>
                <input 
                  pInputText
                  [ngModel]="settings().additionalArgs"
                  (ngModelChange)="updateSetting('additionalArgs', $event)"
                  placeholder="-XX:+UseZGC"
                  class="w-full"
                />
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  `,
  styles: []
})
export class SettingsComponent implements OnInit {
  private readonly mcService = inject(MinecraftService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
    constructor() {
      // Fallback: si jamais le guard n'est pas appelé (navigation directe, bug Angular, etc)
      if (!this.authStore.isAuthenticated()) {
        this.router.navigate(['/login']);
      }
    }
  
  settings = signal<GameSettings>({
    minRamMb: 2048,
    maxRamMb: 4096,
    gameDirectory: '',
    fullscreen: false,
    screenWidth: 1280,
    screenHeight: 720,
    javaPath: '',
    additionalArgs: ''
  });
  
  readonly info = this.mcService.info;
  
  ngOnInit(): void {
    const currentSettings = this.mcService.settings();
    if (currentSettings) {
      this.settings.set({ ...currentSettings });
    }
  }
  
  onSave(): void {
    this.mcService.updateSettings(this.settings()).subscribe(response => {
      if ((response as any).success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Saved',
          detail: 'Settings updated'
        });
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to save'
        });
      }
    });
  }
  
  onBack(): void {
    this.router.navigate(['/dashboard']);
  }
  
  updateSetting<K extends keyof GameSettings>(key: K, value: GameSettings[K]): void {
    this.settings.update(s => ({ ...s, [key]: value }));
  }
  
  formatRam(value: number): string {
    return value >= 1024 ? `${(value / 1024).toFixed(1)} GB` : `${value} MB`;
  }
}
