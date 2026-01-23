import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContentService } from '../../../service/content.service';

@Component({
  selector: 'app-loan-application-home',
  templateUrl: './loan-application-home.component.html',
  styleUrls: ['./loan-application-home.component.css'],
})
export class LoanApplicationHomeComponent implements OnInit {

  flowSteps: any = {};
  flowPercent = 0; // 🔥 ADD THIS

  constructor(
    private contentService: ContentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.getBorrowerSnapshot();
  }


getBorrowerSnapshot() {
  this.contentService.getBorrowerSnapshot().subscribe({
    next: (res: any) => {
      if (!res?.success) return;
      this.flowSteps = res.data.applicationFlow?.steps || {};
              const appFlow = res.data.applicationFlow;

              this.flowPercent = appFlow?.percent || 0; // 🔥 SET PERCENT

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
// - completed (already filled)
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

    // detect active step
    if (this.flowSteps[key] === false && !foundActive) {
      foundActive = true;
      // this is active, not locked
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
