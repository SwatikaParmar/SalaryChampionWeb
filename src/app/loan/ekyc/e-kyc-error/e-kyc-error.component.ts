import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-e-kyc-error',
  templateUrl: './e-kyc-error.component.html',
  styleUrl: './e-kyc-error.component.css'
})
export class EKycErrorComponent implements OnInit {

  reason = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.reason = params['reason'] || '';
    });
  }

  retry() {
    this.router.navigate(['/dashboard/loan/ekyc']);
  }

  goBack() {
    this.router.navigate(['/dashboard/loan']);
  }
}
