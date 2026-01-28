import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { ContentService } from '../../../../service/content.service';

@Component({
  selector: 'app-bank-verification',
  templateUrl: './bank-verification.component.html',
  styleUrls: ['./bank-verification.component.css'],
})
export class BankVerificationComponent implements OnInit {

  consentId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private contentService: ContentService,
    private spinner: NgxSpinnerService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {

    this.route.queryParams.subscribe(params => {
      const success = params['success'];
      const errorMsg = params['errormsg'];
      const errorCode = params['errorcode'];
      this.consentId = params['id']; // 🔥 GET ID HERE

      // 🔥 Redirect on failure
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

  // ================= VERIFY BANK =================
  verifyBankConsent() {

    if (!this.consentId) {
      this.toastr.error('Consent ID not found');
      return;
    }

    this.spinner.show();

    this.contentService.verifyBank(this.consentId).subscribe({
      next: (res: any) => {
        this.spinner.hide();

        if (res?.success) {
          this.toastr.success(res.messages || 'Bank verification successful');

          // ✅ Go to next step
          this.router.navigate(['/dashboard/loan/bank-statement']);
        } else {
          this.toastr.error(res?.messages || 'Verification failed');
        }
      },
      error: () => {
        this.spinner.hide();
        this.toastr.error('Unable to verify bank consent');
      }
    });
  }

  // ================= SKIP =================
  skipProcess() {
    this.router.navigate(['/dashboard/loan']);
  }

  // ================= RE-INITIATE =================
  reInitiate() {
    this.router.navigate(['/dashboard/loan/bank']);
  }
}
