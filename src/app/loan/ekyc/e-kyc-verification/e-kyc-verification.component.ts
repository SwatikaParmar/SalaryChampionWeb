import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ContentService } from '../../../../service/content.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { getFirstApiErrorMessage } from '../../../../service/api-error.util';

declare var bootstrap: any;

@Component({
  selector: 'app-e-kyc-verification',
  templateUrl: './e-kyc-verification.component.html',
  styleUrl: './e-kyc-verification.component.css',
})
export class EKYCVerificationComponent implements OnInit {

  requestId = '';
  applicationId = '';
  showSuccessModal = false;
  isLoadingApplication = false;
  isVerifying = false;

  constructor(
    private route: ActivatedRoute,
    private contentService: ContentService,
    private router: Router,
    private spinner: NgxSpinnerService,
    private toastr: ToastrService
  ) {}

  private openEkycError(reason = ''): void {
    this.router.navigate(['/dashboard/loan/ekyc-error'], {
      queryParams: reason ? { reason } : undefined,
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.requestId = params['requestId'] || '';
      const status = params['status'];
      const reason = params['reason'] || '';

      if (!this.requestId || status !== 'success') {
        this.openEkycError(reason);
        return;
      }

      this.getBorrowerSnapshot();
    });
  }

  getBorrowerSnapshot() {
    this.isLoadingApplication = true;

    this.contentService.getBorrowerSnapshot().subscribe(res => {
      this.isLoadingApplication = false;

      if (res?.success) {
        this.applicationId = res.data.application.id;
        return;
      }

      this.openEkycError(getFirstApiErrorMessage(res, 'Unable to load application details'));
    }, () => {
      this.isLoadingApplication = false;
      this.openEkycError('Unable to load application details');
    });
  }

  verifyEkyc() {
    if (!this.requestId || !this.applicationId || this.isLoadingApplication || this.isVerifying) {
      this.toastr.warning('Please wait, verification details are still loading.');
      return;
    }

    const payload = {
      requestId: this.requestId,
      applicationId: this.applicationId
    };

    this.isVerifying = true;
    this.spinner.show();

    this.contentService.verifyEkyc(payload).subscribe({
      next: (res: any) => {
        this.isVerifying = false;
        this.spinner.hide();

        if (res?.success) {
          this.openSuccessModal();
        } else {
          this.openEkycError(getFirstApiErrorMessage(res));
        }
      },
      error: (err) => {
        this.isVerifying = false;
        this.spinner.hide();
        this.openEkycError(getFirstApiErrorMessage(err));
      }
    });
  }

  /* ================= MODAL CONTROLS ================= */

  openSuccessModal() {
    const modalEl = document.getElementById('ekycSuccessModal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }

  onSuccessOk() {
    this.router.navigate(['/dashboard/loan/bank']);
  }

  onSuccessCancel() {
    this.router.navigate(['/dashboard/loan']);
  }
}
