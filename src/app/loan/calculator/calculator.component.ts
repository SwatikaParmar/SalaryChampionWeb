import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContentService } from '../../../service/content.service';

@Component({
  selector: 'app-calculator',
  templateUrl: './calculator.component.html',
  styleUrl: './calculator.component.css',
})
export class CalculatorComponent implements OnInit {

  // UI
  purpose = 'PERSONAL';

  // limits (from GET)
  minPrincipal = 0;
  maxPrincipal = 0;
  minTenure = 0;
  maxTenure = 0;

  // selected values
  principal = 0;
  tenure = 0;

  // pricing (from GET)
  interestRateMonthly = 0;
  processingFeePercent = 0;
  gstPercentOnPF = 0;

  // calculated values (from POST)
  emi = 0;
  totalInterest = 0;
  grandTotalPayable = 0;
  netDisbursal = 0;

  applicationId = '';
  isCalculating = false;

  constructor(
    private router: Router,
    private contentService: ContentService
  ) {}

  ngOnInit(): void {
    this.getBorrowerSnapshot();
  }

  // ================= GET BORROWER SNAPSHOT =================
  getBorrowerSnapshot() {
    this.contentService.getBorrowerSnapshot().subscribe({
      next: (res: any) => {
        if (!res?.success) return;

        const eligibility = res.data.offer?.eligibility;
        const quote = res.data.offer?.latestQuote;
        const application = res.data.application;

        if (!eligibility || !application) return;

        // applicationId
        this.applicationId = application.id;

        // limits
        this.minPrincipal = eligibility.limits.minPrincipal;
        this.maxPrincipal = eligibility.limits.maxPrincipal;
        this.minTenure = eligibility.limits.minTenureDays;
        this.maxTenure = eligibility.limits.maxTenureDays;

        // pricing
        this.interestRateMonthly = eligibility.roiMonthlyPercent;
        this.processingFeePercent = eligibility.pricing.processingFeePercent;
        this.gstPercentOnPF = eligibility.pricing.gstPercentOnPF;

        // defaults
        this.principal = quote?.principal || this.minPrincipal;
        this.tenure = eligibility.tenureDays || this.minTenure;

        // initial values (if quote exists)
        if (quote) {
          this.emi = quote.emi;
          this.totalInterest = quote.totalInterest;
          this.grandTotalPayable = quote.grandTotalPayable;
          this.netDisbursal = quote.netDisbursal;
        }
      },
      error: () => console.error('Failed to fetch borrower snapshot'),
    });
  }

  // ================= POST EMI QUOTE =================
  recalculateQuote() {
    if (!this.applicationId) return;

    this.isCalculating = true;

    const payload = {
      applicationId: this.applicationId,
      principal: this.principal,
      tenure: this.tenure,
      repaymentType: 'MONTHLY',
      rate: this.interestRateMonthly * 12, // API expects annual
      processingFee: this.processingFeePercent,
      loanPurpose: this.purpose,
    };

    this.contentService.emiLoanQuote(payload).subscribe({
      next: (res: any) => {
        this.isCalculating = false;

        if (res?.success && res?.data) {
          this.emi = res.data.emi;
          this.totalInterest = res.data.totalInterest;
          this.grandTotalPayable = res.data.grandTotalPayable;
          this.netDisbursal = res.data.netDisbursal;
        }
      },
      error: () => {
        this.isCalculating = false;
        console.error('EMI calculation failed');
      },
    });
  }

acceptLoan() {
  if (!this.applicationId) return;

  const payload = {
    applicationId: this.applicationId,
    decision: 'ACCEPT',
    amountApproved: this.principal,
    roi: this.interestRateMonthly / 100, // convert % to decimal
    tenureMonths: Math.ceil(this.tenure / 30), // days → months (safe)
    remarks: 'Customer accepted the quote',
  };

  this.contentService.accetLoanDecision(payload).subscribe({
    next: (res: any) => {
      if (res?.success) {
        // ✅ SUCCESS → NEXT STEP
        this.router.navigate(['dashboard/loan/employment']);
      }
    },
    error: () => {
      console.error('Accept loan failed');
    },
  });
}



}
