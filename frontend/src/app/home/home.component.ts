import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  template: `
    <div class="min-h-screen bg-zinc-950 flex items-center justify-center p-8">
      <div class="text-center">
        <h1 class="text-2xl font-semibold text-white mb-4">{{ title() }}</h1>
        @if (message()) {
          <p class="text-zinc-400 mb-4">{{ message() }}</p>
        }
        <p-button label="Test Backend" (onClick)="callBackend()" />
      </div>
    </div>
  `,
  styles: []
})
export class HomeComponent {
  protected readonly title = signal('Application Spring Boot + Angular');
  protected readonly message = signal('');

  private readonly http = inject(HttpClient);
  private readonly apiService = inject(ApiService);

  callBackend(): void {
    this.http.post(`${this.apiService.getBaseUrl()}/api/hello`, 'Message from Angular!', {
      headers: { 'Content-Type': 'text/plain' },
      responseType: 'text'
    }).subscribe({
      next: (response) => {
        console.log('Response received from back-end:', response);
        this.message.set(response);
      },
      error: (error) => {
        console.error('Error occurred while calling back-end:', error);
        this.message.set('Error occurred while calling back-end');
      }
    });
  }
}
