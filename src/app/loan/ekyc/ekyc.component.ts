import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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
        if (!res?.success) return;

        this.applicationId = res.data?.application?.id || '';
      },
      error: () => {
        this.errorMsg = 'Failed to load application';
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
    };

    this.contentService.ekycStart(payload).subscribe({
      next: (res: any) => {
        this.loading = false;

        if (res?.success && res?.data?.url) {
          // 🔥 SAME TAB REDIRECT (NO NEW TAB)
          window.location.href = res.data.url;
        } else {
          this.errorMsg = 'Unable to start eKYC';
        }
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'eKYC initiation failed';
      },
    });
  }

  // ================= AFTER EKYC =================
  continueAfterEkyc() {
    this.router.navigate(['dashboard/loan/bank-statement']);
  }
}
