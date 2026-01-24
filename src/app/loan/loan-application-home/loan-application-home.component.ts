import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContentService } from '../../../service/content.service';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-loan-application-home',
  templateUrl: './loan-application-home.component.html',
  styleUrls: ['./loan-application-home.component.css'],
})
export class LoanApplicationHomeComponent implements OnInit {

  flowSteps: any = {};
  flowPercent = 0;

  constructor(
    private contentService: ContentService,
    private router: Router,
    private spinner: NgxSpinnerService   // ✅ ADD
  ) {}

  ngOnInit(): void {
    this.getBorrowerSnapshot();
  }

  /* ================= SNAPSHOT ================= */
  getBorrowerSnapshot() {
    this.spinner.show(); // 🔥 START LOADER

    this.contentService.getBorrowerSnapshot().subscribe({
      next: (res: any) => {
        this.spinner.hide(); // ✅ STOP LOADER

        if (!res?.success) return;

        const appFlow = res.data.applicationFlow;

        this.flowSteps = appFlow?.steps || {};
        this.flowPercent = appFlow?.percent || 0;
      },
      error: () => {
        this.spinner.hide(); // ✅ STOP EVEN ON ERROR
        console.error('Failed to load application flow');
      }
    });
  }

  /* ================= HELPERS ================= */

  // completed but NOT editable
  isCompleted(step: string): boolean {
    return this.flowSteps?.[step] === true;
  }

  // first false step = active
  isActive(step: string): boolean {
    for (const key of Object.keys(this.flowSteps)) {
      if (!this.flowSteps[key]) {
        return key === step;
      }
    }
    return false;
  }

  // ❌ locked if:
  // - completed
  // - OR comes after active step
  isLocked(step: string): boolean {
    // 🔥 Disbursal always editable
    if (step === 'disbursalBankDetails') return false;

    let foundActive = false;

    for (const key of Object.keys(this.flowSteps)) {

      // completed → locked
      if (this.flowSteps[key] === true && key === step) {
        return true;
      }

      // detect active
      if (this.flowSteps[key] === false && !foundActive) {
        foundActive = true;
        return key !== step;
      }

      // after active → locked
      if (foundActive && key === step) {
        return true;
      }
    }

    return true;
  }

  // navigation allowed only if NOT locked
  navigate(step: string, route: string) {
    if (this.isLocked(step)) return;
    this.router.navigate([route]);
  }
}
