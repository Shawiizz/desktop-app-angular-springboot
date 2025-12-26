import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { Button } from 'primeng/button';
import { Toast } from 'primeng/toast';
import { Divider } from 'primeng/divider';
import { MessageService } from 'primeng/api';
import { AuthStoreService } from '../../services/auth-store.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputText,
    Password,
    Button,
    Toast,
    Divider
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    
    <div class="bg-black w-screen h-screen flex justify-center items-center">
      <div class="bg-zinc-900 rounded-lg flex p-10 px-12 shadow-2xl">
        <!-- Left side - Branding -->
        <div class="flex flex-col w-64">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl blueGradient flex items-center justify-center">
              <i class="pi pi-box text-xl text-white"></i>
            </div>
            <h1 class="text-blue-400 text-2xl font-bold">MC Launcher</h1>
          </div>
          
          <div class="flex flex-col gap-2 mt-8">
            <div class="flex items-center gap-3 text-white">
              <span class="pi pi-download text-primary"></span>
              <p class="text-sm">Auto-update with NeoForge</p>
            </div>
            <div class="flex items-center gap-3 text-white">
              <span class="pi pi-bolt text-primary"></span>
              <p class="text-sm">Optimized performance</p>
            </div>
            <div class="flex items-center gap-3 text-white">
              <span class="pi pi-cog text-primary"></span>
              <p class="text-sm">Easy configuration</p>
            </div>
          </div>
          
          <div class="flex flex-col mt-8 text-sm">
            <p class="text-surface-400">Minecraft 1.21.1</p>
            <p class="text-surface-500">NeoForge 21.1.77</p>
          </div>
        </div>
        
        <div class="px-8">
          <p-divider layout="vertical" />
        </div>
        
        <!-- Right side - Login Form -->
        <div class="w-80">
          <h2 class="text-white font-semibold text-lg mb-6">Sign in to play</h2>
          
          <form (ngSubmit)="onSubmit()" novalidate>
            <div class="flex flex-col gap-5">
              <div class="flex flex-col gap-2">
                <label for="username" class="text-sm text-surface-300">Username</label>
                <input 
                  pInputText 
                  type="text" 
                  id="username" 
                  name="username" 
                  [(ngModel)]="username"
                  placeholder="Enter your username"
                  [disabled]="isLoading()"
                  [class.ng-invalid]="usernameInvalid" />
                @if (usernameInvalid) {
                  <small class="text-red-400 text-xs">Username is required</small>
                }
              </div>
              
              <div class="flex flex-col gap-2">
                <label for="password" class="text-sm text-surface-300">Password</label>
                <p-password 
                  [(ngModel)]="password" 
                  inputId="password" 
                  name="password" 
                  [toggleMask]="true"
                  [feedback]="false"
                  placeholder="Enter your password"
                  [disabled]="isLoading()"
                  [class.ng-invalid]="passwordInvalid"
                  styleClass="w-full"
                  inputStyleClass="w-full" />
                @if (passwordInvalid) {
                  <small class="text-red-400 text-xs">Password is required</small>
                }
              </div>
              
              <p-button 
                type="submit"
                [label]="isLoading() ? 'Signing in...' : 'Sign in'" 
                severity="contrast" 
                styleClass="w-full"
                [loading]="isLoading()"
                [disabled]="isLoading()" />
            </div>
          </form>
          
          <div class="mt-6 text-center">
            <p class="text-surface-500 text-xs">Demo: player / password</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class LoginComponent {
  private readonly authStore = inject(AuthStoreService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  
  username = '';
  password = '';
  usernameInvalid = false;
  passwordInvalid = false;
  
  readonly isLoading = this.authStore.isLoading;
  
  onSubmit(): void {
    // Reset validation
    this.usernameInvalid = false;
    this.passwordInvalid = false;
    
    // Validate
    if (!this.username) {
      this.usernameInvalid = true;
    }
    if (!this.password) {
      this.passwordInvalid = true;
    }
    
    if (this.usernameInvalid || this.passwordInvalid) {
      return;
    }
    
    this.authStore.login({
      username: this.username,
      password: this.password
    }).subscribe(response => {
      if (response.success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Welcome',
          detail: `Logged in as ${response.user?.displayName}`
        });
        setTimeout(() => this.router.navigate(['/dashboard']), 500);
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: response.message
        });
      }
    });
  }
}
