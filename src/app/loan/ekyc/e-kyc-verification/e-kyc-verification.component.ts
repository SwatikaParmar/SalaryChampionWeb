import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ContentService } from '../../../../service/content.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';

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

  constructor(
    private route: ActivatedRoute,
    private contentService: ContentService,
    private router: Router,
    private spinner: NgxSpinnerService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.requestId = params['requestId'] || '';
      const status = params['status'];

      if (!this.requestId || status !== 'success') {
        this.router.navigate(['/dashboard/loan/e-kyc-error']);
        return;
      }

      this.getBorrowerSnapshot();
    });
  }

  getBorrowerSnapshot() {
    this.contentService.getBorrowerSnapshot().subscribe(res => {
      if (res?.success) {
        this.applicationId = res.data.application.id;
      }
    });
  }

  verifyEkyc() {
    const payload = {
      requestId: this.requestId,
      applicationId: this.applicationId
    };

    this.spinner.show();

    this.contentService.verifyEkyc(payload).subscribe({
      next: (res: any) => {
        this.spinner.hide();

        if (res?.success) {
          this.openSuccessModal();
        } else {
          this.router.navigate(['/dashboard/loan/e-kyc-error']);
        }
      },
      error: () => {
        this.spinner.hide();
        this.router.navigate(['/dashboard/loan/e-kyc-error']);
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
