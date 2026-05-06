import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  HostListener,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AuthServiceService } from '../../../service/auth-service.service';

@Component({
  selector: 'app-dashboard-layout',
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.css'
})
export class DashboardLayoutComponent implements OnInit, OnDestroy {
  isSidebarOpen = true;
  private readonly isBrowser: boolean;
  private routerSubscription: Subscription | null = null;

  constructor(
    private router: Router,
    private authService: AuthServiceService,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.setSidebarStateByViewport();
    this.storeCurrentRoute();
    this.routerSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.storeCurrentRoute(event.urlAfterRedirects);
      });
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.setSidebarStateByViewport();
  }

  private storeCurrentRoute(url?: string): void {
    if (!this.isBrowser) {
      return;
    }

    this.authService.setLastProtectedRoute(
      url ||
        this.router.url ||
        `${window.location.pathname}${window.location.search}${window.location.hash}`,
    );
  }

  private setSidebarStateByViewport(): void {
    if (!this.isBrowser) {
      this.isSidebarOpen = true;
      return;
    }

    this.isSidebarOpen = window.innerWidth > 992;
  }
}
