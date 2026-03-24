import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { ContentService } from '../../../service/content.service';

@Component({
  selector: 'app-bank',
  templateUrl: './bank.component.html',
  styleUrl: './bank.component.css',
})
export class BankComponent implements OnInit {
  applicationId: any;

  constructor(
    private contentService: ContentService,
    private router: Router,
    private spinner: NgxSpinnerService, // ✅ spinner
    private toastr: ToastrService, // ✅ toaster
  ) {}

  ngOnInit(): void {
    this.getBorrowerSnapshot();
  }

  // ================= GET APPLICATION ID =================
  getBorrowerSnapshot() {
    this.spinner.show();

    this.contentService.getBorrowerSnapshot().subscribe({
      next: (res: any) => {
        this.spinner.hide();

        if (!res?.success) {
          this.toastr.error('Failed to load borrower details');
          return;
        }

        this.applicationId = res.data?.application?.id;

        if (!this.applicationId) {
          this.toastr.warning('Application not found');
        }
      },
      error: () => {
        this.spinner.hide();
        this.toastr.error('Failed to fetch borrower snapshot');
      },
    });
  }

  // ================= FETCH BANK STATEMENT =================
fetchBankStatement() {

  if (!this.applicationId) {
    this.toastr.warning('Application ID missing');
    return;
  }

  const payload = {
    applicationId: this.applicationId,
    redirectUrl: 'https://staging.d3kvvposqbz8ni.amplifyapp.com/dashboard/loan/bank-verification',
  };

  this.spinner.show();

  this.contentService.fetchBankStatement(payload).subscribe({

    next: (res: any) => {

      this.spinner.hide();

      // 🔥 HANDLE STRING RESPONSE
      if (typeof res === 'string') {
        try {
          res = JSON.parse(res);
        } catch (e) {
          console.error('Invalid JSON response:', res);
          this.toastr.error('Server response invalid');
          return;
        }
      }

      // ✅ NORMAL FLOW
      if (res?.success && res?.data?.url) {

        this.toastr.success('Redirecting to bank statement');

        // 🔥 BEST REDIRECT
        window.open(res.data.url, '_self');

      } else {
        this.toastr.error(res?.message || 'Failed to generate bank statement link');
      }

    },

    error: (err) => {
      this.spinner.hide();
      console.error(err);
      this.toastr.error('Failed to fetch bank statement');
    }

  });
}


    /* ================= SKIP ================= */
skipProcess() {

  if (!this.applicationId) {
    this.toastr.error('Application ID missing');
    return;
  }

  this.spinner.show();

  this.contentService.skipFetchBankStatement(this.applicationId).subscribe({
    next: () => {

      this.spinner.hide();

      this.toastr.success('Step skipped successfully');

      // ✅ CORRECT REDIRECT
      this.router.navigate(['/dashboard/loan'], {
        queryParams: { refresh: true }
      });

    },
    error: () => {
      this.spinner.hide();
      this.toastr.error('Skip failed');
    }
  });
}
}
