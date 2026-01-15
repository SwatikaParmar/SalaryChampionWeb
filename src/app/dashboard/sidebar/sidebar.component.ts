import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'], // ✅ correct
})
export class SidebarComponent {
  constructor(private router: Router) {}

  logout(): void {
    localStorage.clear();
    this.router.navigateByUrl('/'); // or '/login'
  }
}
