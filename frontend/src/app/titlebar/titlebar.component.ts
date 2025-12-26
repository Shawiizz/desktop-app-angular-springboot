import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigService } from '../services/config.service';
import { getCurrentWindow } from '@tauri-apps/api/window';

@Component({
  selector: 'app-titlebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="titlebar h-8 bg-black flex items-center justify-between px-3 select-none"
         style="-webkit-app-region: drag;">
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 rounded bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
          <i class="pi pi-box text-white text-[8px]"></i>
        </div>
        <span class="text-xs font-medium text-zinc-400">{{ appName }}</span>
      </div>
      
      <div class="flex items-center" style="-webkit-app-region: no-drag;">
        <button class="w-10 h-8 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                (click)="minimize()">
          <i class="pi pi-minus text-xs"></i>
        </button>
        <button class="w-10 h-8 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                (click)="toggleMaximize()">
          <i class="pi pi-stop text-xs"></i>
        </button>
        <button class="w-10 h-8 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-red-600 transition-colors"
                (click)="close()">
          <i class="pi pi-times text-xs"></i>
        </button>
      </div>
    </div>
  `,
  styles: []
})
export class TitlebarComponent implements OnInit {
  appName = 'Desktop App';
  private readonly configService = inject(ConfigService);

  ngOnInit(): void {
    this.configService.getConfig().subscribe({
      next: (config) => {
        this.appName = config.name;
      },
      error: () => {
        // Keep default name
      }
    });
  }

  async minimize(): Promise<void> {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.minimize();
    } catch (e) {
      console.error('Failed to minimize:', e);
    }
  }

  async toggleMaximize(): Promise<void> {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.toggleMaximize();
    } catch (e) {
      console.error('Failed to toggle maximize:', e);
    }
  }

  async close(): Promise<void> {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.close();
    } catch (e) {
      console.error('Failed to close:', e);
    }
  }
}
