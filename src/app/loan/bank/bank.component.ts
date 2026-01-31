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
      redirectUrl: 'https://d2sgezubpok1gq.cloudfront.net/dashboard/loan/bank-verification',
    };

    this.spinner.show();

    this.contentService.fetchBankStatement(payload).subscribe({
      next: (res: any) => {
        this.spinner.hide();

        if (res?.success && res?.data?.url) {
          this.toastr.success('Redirecting to bank statement');

          // ✅ SAME TAB redirect
          window.location.href = res.data.url;
        } else {
          this.toastr.error('Failed to generate bank statement link');
        }
      },
      error: () => {
        this.spinner.hide();
        this.toastr.error('Failed to fetch bank statement');
      },
    });
  }
}
