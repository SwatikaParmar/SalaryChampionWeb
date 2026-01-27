import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-error-verification',
  templateUrl: './error-verification.component.html',
  styleUrls: ['./error-verification.component.css']
})
export class ErrorVerificationComponent {

  errorMessage =
    'We were unable to fetch your bank statement. Please try again.';

  constructor(private router: Router) {}

  goToLoanDashboard() {
    this.router.navigate(['/dashboard/loan']);
  }

  retryBankFlow() {
    this.router.navigate(['/dashboard/loan/bank']);
  }
}
