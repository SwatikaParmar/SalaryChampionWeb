import { Component, OnInit } from '@angular/core';
import { ContentService } from '../../../service/content.service';
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {

  // flags
  isProfileComplete = false;

  // progress values
  profileProgress = 0;
  loanProgress = 0;
  overallProgress = 0;

  constructor(private contentService: ContentService) {}

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
      error: () => console.error('Failed to fetch borrower snapshot'),
    });
  }
}
