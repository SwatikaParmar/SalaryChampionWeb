import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-error-verification',
  templateUrl: './error-verification.component.html',
  styleUrls: ['./error-verification.component.css']
})
export class ErrorVerificationComponent implements OnInit {
  errorMessage = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.errorMessage = params['reason'] || history.state?.message || '';
    });
  }

  goToLoanDashboard() {
    this.router.navigate(['/dashboard/loan']);
  }

  retryBankFlow() {
    this.router.navigate(['/dashboard/loan/bank']);
  }
}
