// token-refresh.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class TokenRefreshService implements OnDestroy {

  private refreshSub!: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  start(): void {
    // 🔁 every 4 minutes (240000 ms)
    this.refreshSub = interval(240000).subscribe(() => {
      this.refresh();
    });
  }

  refresh(): void {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return;

    this.authService.refreshToken().subscribe({
      next: (res) => {
        if (res?.success && res?.data?.accessToken) {
          localStorage.setItem('token', res.data.accessToken);
          console.log('🔁 Token refreshed');
        } else {
          this.logout();
        }
      },
      error: () => {
        this.logout();
      }
    });
  }

  stop(): void {
    this.refreshSub?.unsubscribe();
  }

  logout(): void {
    this.stop();
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
