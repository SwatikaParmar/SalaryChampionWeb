import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthServiceService } from '../../../service/auth-service.service';
import { ContentService } from '../../../service/content.service';
import { DashboardRefreshService } from '../dashboard-refresh.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'], // ✅ correct
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() isSidebarOpen = true;
  @Output() sidebarClosed = new EventEmitter<void>();

  profileProgress: any;
  loanProgress: any;
  overallProgress: any;
  isProfileComplete: any;
  private refreshSubscription: Subscription | null = null;
  constructor(
    private router: Router,
    private contentService: ContentService,
    private authService: AuthServiceService,
    private dashboardRefreshService: DashboardRefreshService,
  ) {}


 ngOnInit(): void {
    this.getBorrowerSnapshot();
    this.refreshSubscription = this.dashboardRefreshService.refreshRequests$.subscribe(() => {
      this.getBorrowerSnapshot();
    });
  }

  ngOnDestroy(): void {
    this.refreshSubscription?.unsubscribe();
  }

    getBorrowerSnapshot() {

    this.contentService.getBorrowerSnapshot().subscribe({
      next: (res: any) => {

        if (!res?.success) return;

        const data = res.data;

        // ✅ Progress values
        this.profileProgress = data.basicFlow?.percent || 0;
        this.loanProgress = data.applicationFlow?.percent || 0;
        this.overallProgress = data.progressPercent || 0;

        // ✅ Profile completion check
        this.isProfileComplete = this.profileProgress === 100;
      },
      error: () => {
      },
    });
  }
  logout(): void {
    this.authService.logout({ preserveLoginLocation: true });
    this.router.navigateByUrl('/', { replaceUrl: true });
  }

  closeSidebar(): void {
    this.sidebarClosed.emit();
  }

  get isMobile(): boolean {
    return window.innerWidth <= 992;
  }
}
