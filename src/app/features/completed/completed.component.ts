import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-completed',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './completed.component.html',
  styleUrl: './completed.component.css'
})
export class CompletedComponent {
  constructor(
    private router: Router,
    private auth: AuthService
  ) {}

continue(): void {
  this.auth.logout();
  localStorage.clear();
  sessionStorage.clear();
  this.router.navigate(['/login']);
}
}