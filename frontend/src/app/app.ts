import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TitlebarComponent } from './titlebar/titlebar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TitlebarComponent],
  template: `
    <app-titlebar></app-titlebar>
    <div class="app-content">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }
    .app-content {
      flex: 1;
      overflow: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .app-content::-webkit-scrollbar {
      display: none;
    }
  `]
})
export class App {}

