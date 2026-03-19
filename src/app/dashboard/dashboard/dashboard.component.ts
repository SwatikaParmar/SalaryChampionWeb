import { Component, OnInit } from '@angular/core';
import { ContentService } from '../../../service/content.service';
import { NgxSpinnerService } from 'ngx-spinner';

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


  isEligible: boolean = true;
ineligibleReason: string = '';
retryDate: string = '';

trackingSteps: any = {};
currentTitle: string = '';
currentMessage: string = '';
  constructor(
    private contentService: ContentService,
    private spinner: NgxSpinnerService   // ✅ spinner inject
  ) {}

  ngOnInit(): void {
    this.getBorrowerSnapshot();
  }

  getBorrowerSnapshot() {
    this.spinner.show();   // ✅ START spinner

    this.contentService.getBorrowerSnapshot().subscribe({
      next: (res: any) => {
        this.spinner.hide();   // ✅ STOP spinner

        if (!res?.success) return;

        const data = res.data;


        const eligibility = data.eligibility;

this.isEligible = eligibility?.isEligible ?? true;

if (!this.isEligible) {
  this.ineligibleReason = eligibility?.reasons?.[0] || '';
  this.retryDate = eligibility?.nextEligibilityAllowedOn || '';
}

const tracking = data.loanTracking;

this.trackingSteps = tracking?.steps || {};
this.currentTitle = tracking?.currentTitle || '';
this.currentMessage = tracking?.currentMessage || '';


        // ✅ Progress values
        this.profileProgress = data.basicFlow?.percent || 0;
        this.loanProgress = data.applicationFlow?.percent || 0;
        this.overallProgress = data.progressPercent || 0;

        // ✅ Profile completion check
        this.isProfileComplete = this.profileProgress === 100;
      },
      error: () => {
        this.spinner.hide();   // ✅ STOP spinner on error
        console.error('Failed to fetch borrower snapshot');
      },
    });
  }
}
