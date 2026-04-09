import { Component, HostListener, OnInit } from '@angular/core';

@Component({
  selector: 'app-dashboard-layout',
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.css'
})
export class DashboardLayoutComponent implements OnInit {
  isSidebarOpen = true;

  ngOnInit(): void {
    this.setSidebarStateByViewport();
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

  private setSidebarStateByViewport(): void {
    this.isSidebarOpen = window.innerWidth > 992;
  }
}
