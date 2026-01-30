import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ContentService } from '../../../service/content.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'], // ✅ correct
})
export class SidebarComponent {
  profileProgress: any;
  loanProgress: any;
  overallProgress: any;
  isProfileComplete: any;
  constructor(private router: Router,    private contentService: ContentService,
  ) {}


 ngOnInit(): void {
    this.getBorrowerSnapshot();
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
    localStorage.clear();
    this.router.navigateByUrl('/'); // or '/login'
  }
}
