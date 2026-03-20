import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ContentService } from '../../../service/content.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Subscription } from 'rxjs';



@Component({
  selector: 'app-loan-application-home',
  templateUrl: './loan-application-home.component.html',
  styleUrls: ['./loan-application-home.component.css'],
})
export class LoanApplicationHomeComponent implements OnInit, OnDestroy {

  flowSteps: any = {};
  flowPercent = 0;

  applicationId: string = '';
  routeSub!: Subscription;
  stepNumbers: any = {
  loanCalculator: 1,
  employmentDetails: 2,
  aadhaarEKyc: 3,
  fetchBankStatement: 4,
  references: 5,
  documents: 6,
  disbursalBankDetails: 7
};
  constructor(
    private contentService: ContentService,
    private router: Router,
    private spinner: NgxSpinnerService,
    private route: ActivatedRoute // ✅ FIX
  ) {}

  ngOnInit(): void {

    // 🔥 get applicationId

    // 🔥 listen refresh
    this.routeSub = this.route.queryParams.subscribe(() => {
      this.getBorrowerSnapshot(); // always call once
    });
  }




getStepNumber(step: string): number {
  return this.stepNumbers[step];
}

  ngOnDestroy(): void {
    if (this.routeSub) {
      this.routeSub.unsubscribe(); // ✅ FIX memory leak
    }
  }



  /* ================= SNAPSHOT ================= */
  getBorrowerSnapshot() {

    this.spinner.show();

    this.contentService.getBorrowerSnapshot().subscribe({
      next: (res: any) => {
        this.spinner.hide();

        if (!res?.success) return;
        this.applicationId = res.data?.application?.id;

        const appFlow = res.data.applicationFlow;

        this.flowSteps = appFlow?.steps || {};
        this.flowPercent = appFlow?.percent || 0;
      },
      error: () => {
        this.spinner.hide();
        console.error('Failed to load application flow');
      },
    });
  }

  /* ================= HELPERS ================= */

  isCompleted(step: string): boolean {
    return this.flowSteps?.[step] === true;
  }

  isActive(step: string): boolean {
    for (const key of Object.keys(this.flowSteps)) {
      if (!this.flowSteps[key]) {
        return key === step;
      }
    }
    return false;
  }

  isLocked(step: string): boolean {

    let foundActive = false;

    for (const key of Object.keys(this.flowSteps)) {

      if (this.flowSteps[key] === true && key === step) {
        return true;
      }

      if (this.flowSteps[key] === false && !foundActive) {
        foundActive = true;
        return key !== step;
      }

      if (foundActive && key === step) {
        return true;
      }
    }

    return true;
  }

  navigate(step: string, route: string) {
    if (this.isLocked(step)) return;
    this.router.navigate([route]);
  }

  submitApplication() {
    if (this.flowPercent !== 100) return;
    this.router.navigate(['/dashboard']);
  }

  /* ================= SKIP ================= */
  skipProcess() {

    if (!this.applicationId) {
      console.error('Application ID missing');
      return;
    }

    this.spinner.show();

    this.contentService.skipFetchBankStatement(this.applicationId).subscribe({
      next: () => {

        this.spinner.hide();

        // 🔥 instant UI update
        this.flowSteps['fetchBankStatement'] = true;

        // 🔥 reload snapshot
        this.router.navigate([], {
          queryParams: { refresh: true },
          queryParamsHandling: 'merge'
        });

      },
      error: () => {
        this.spinner.hide();
        console.error('Skip failed');
      }
    });
  }

}