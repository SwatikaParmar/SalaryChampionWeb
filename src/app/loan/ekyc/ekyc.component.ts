import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { getFirstApiErrorMessage } from '../../../service/api-error.util';
import { ContentService } from '../../../service/content.service';
@Component({
  selector: 'app-ekyc',
  templateUrl: './ekyc.component.html',
  styleUrl: './ekyc.component.css',
})
export class EkycComponent implements OnInit {
  applicationId = '';
  ekycUrl: any;
  loading = false;
  errorMsg = '';
  private readonly rootPathUrl = environment.rootPathUrl.replace(/\/+$/, '');

  constructor(
    private contentService: ContentService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.getBorrowerSnapshot();
  }

  // ================= GET APPLICATION ID =================
  getBorrowerSnapshot() {
    this.contentService.getBorrowerSnapshot().subscribe({
      next: (res: any) => {
        if (!res?.success) {
          this.errorMsg = getFirstApiErrorMessage(res);
          return;
        }

        this.applicationId = res.data?.application?.id || '';
      },
      error: (err) => {
        this.errorMsg = getFirstApiErrorMessage(err);
      },
    });
  }

  // ================= START EKYC =================
  startEkyc() {
    if (!this.applicationId) return;

    this.loading = true;
    this.errorMsg = '';

    const payload = {
      applicationId: this.applicationId,
          successRedirectUrl:
        'https://staging.d3vz8sn6l3j2ck.amplifyapp.com/dashboard/loan/ekyc-verification',
      failureRedirectUrl: 'https://staging.d3vz8sn6l3j2ck.amplifyapp.com/dashboard/loan/ekyc-error',

    };

    this.contentService.ekycStart(payload).subscribe({
      next: (res: any) => {
        this.loading = false;

        if (res?.success && res?.data?.url) {
          // 🔥 SAME TAB REDIRECT (NO NEW TAB)
          window.location.href = res.data.url;
        } else {
          this.errorMsg = getFirstApiErrorMessage(res);
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = getFirstApiErrorMessage(err);
      },
    });
  }

  // ================= AFTER EKYC =================
  continueAfterEkyc() {
    this.router.navigate(['dashboard/loan']);
  }
}
