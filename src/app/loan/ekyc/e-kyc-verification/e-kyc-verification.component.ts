import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { ContentService } from '../../../../service/content.service';

@Component({
  selector: 'app-e-kyc-verification',
  templateUrl: './e-kyc-verification.component.html',
  styleUrl: './e-kyc-verification.component.css',
})
export class EKYCVerificationComponent implements OnInit {
  applicationId!: string;
  requestId!: string;

  constructor(
    private route: ActivatedRoute,
    private contentService: ContentService,
    private router: Router,
    private spinner: NgxSpinnerService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    // ✅ 1️⃣ requestId URL se lo
    this.requestId = this.route.snapshot.paramMap.get('requestId') || '';

    if (!this.requestId) {
      this.toastr.error('Invalid e-KYC callback');
      return;
    }

    // ✅ 2️⃣ applicationId snapshot se lo
    this.getBorrowerSnapshot();
  }

  // ================= GET APPLICATION ID =================
  getBorrowerSnapshot() {
    this.contentService.getBorrowerSnapshot().subscribe({
      next: (res: any) => {
        if (!res?.success) {
          this.toastr.error('Failed to load application');
          return;
        }

        this.applicationId = res.data?.application?.id;

        if (!this.applicationId) {
          this.toastr.error('Application not found');
          return;
        }

        // ✅ 3️⃣ dono mil gaye → verify eKYC
        this.verifyEkyc();
      },
      error: () => {
        this.toastr.error('Failed to load application');
      },
    });
  }

  // ================= VERIFY EKYC =================
  verifyEkyc() {
    const payload = {
      requestId: this.requestId,
      applicationId: this.applicationId,
    };

    this.spinner.show();

    this.contentService.verifyEkyc(payload).subscribe({
      next: (res: any) => {
        this.spinner.hide();

        if (res?.success) {
          this.toastr.success('e-KYC verified successfully');

          // ✅ 4️⃣ SUCCESS → Reference Page
          this.router.navigate(['dashboard/loan/reference']);
        } else {
          this.toastr.error(res?.message || 'e-KYC verification failed');
        }
      },
      error: () => {
        this.spinner.hide();
        this.toastr.error('e-KYC verification failed');
      },
    });
  }
}
