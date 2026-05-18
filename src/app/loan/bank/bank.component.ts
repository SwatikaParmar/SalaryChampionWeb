import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { getFirstApiErrorMessage } from '../../../service/api-error.util';
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
    private spinner: NgxSpinnerService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.getBorrowerSnapshot();
  }

  goToLoanHome() {
    this.navigateToLoanHomeWithRefresh('aadhaarEKyc');
  }

  // ================= GET APPLICATION ID =================
  getBorrowerSnapshot() {
    this.spinner.show();

    this.contentService.getBorrowerSnapshot().subscribe({
      next: (res: any) => {
        this.spinner.hide();

        if (!res?.success) {
          this.toastr.error(
            getFirstApiErrorMessage(res, 'Failed to load borrower details'),
          );
          return;
        }

        this.applicationId = res.data?.application?.id;

        if (!this.applicationId) {
          this.toastr.warning('Application not found');
        }
      },
      error: (err) => {
        this.spinner.hide();
        this.toastr.error(
          getFirstApiErrorMessage(err, 'Failed to fetch borrower snapshot'),
        );
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
      redirectUrl:
        'https://staging.d1ndeezlom7hf1.amplifyapp.com/dashboard/loan/bank-verification',
    };

    this.spinner.show();

    this.contentService.fetchBankStatement(payload).subscribe({
      next: (res: any) => {
        this.spinner.hide();

        // Handle text responses from the API before reading the payload.
        if (typeof res === 'string') {
          try {
            res = JSON.parse(res);
          } catch (error) {
            console.error('Invalid JSON response:', res, error);
            this.toastr.error('Server response invalid');
            return;
          }
        }

        if (res?.success && res?.data?.url) {
          this.toastr.success('Redirecting to bank statement');
          window.open(res.data.url, '_self');
          return;
        }

        this.toastr.error(
          getFirstApiErrorMessage(res, 'Failed to generate bank statement link'),
        );
      },
      error: (err) => {
        this.spinner.hide();
        console.error(err);
        this.toastr.error(getFirstApiErrorMessage(err, 'Failed to fetch bank statement'));
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
        this.navigateToLoanHomeWithRefresh('fetchBankStatement');
      },
      error: (err) => {
        this.spinner.hide();
        this.toastr.error(getFirstApiErrorMessage(err, 'Skip failed'));
      }
    });
  }

  private navigateToLoanHomeWithRefresh(completedStep?: string) {
    this.router.navigate(['/dashboard/loan'], {
      queryParams: {
        refresh: Date.now(),
        completedStep: completedStep || null,
      },
      replaceUrl: true,
    });
  }
}
