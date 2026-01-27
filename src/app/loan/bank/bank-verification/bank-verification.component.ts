import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-bank-verification',
  templateUrl: './bank-verification.component.html',
  styleUrls: ['./bank-verification.component.css'],
})
export class BankVerificationComponent implements OnInit {

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const success = params['success'];
      const errorMsg = params['errormsg'];
      const errorCode = params['errorcode'];

      // 🔥 IMPORTANT: redirect on failure
      if (success === 'false') {
        this.router.navigate(
          ['/dashboard/loan/error-verification'],
          {
            queryParams: {
              errorcode: errorCode,
              errormsg: errorMsg
            }
          }
        );
      }
    });
  }

  verifyBankConsent() {
    console.log('Verify bank consent clicked');
  }

  skipProcess() {
    this.router.navigate(['/dashboard/loan']);
  }

  reInitiate() {
    this.router.navigate(['/dashboard/loan/bank']);
  }
}
