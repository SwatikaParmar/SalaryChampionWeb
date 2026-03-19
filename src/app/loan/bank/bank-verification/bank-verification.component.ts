import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { ContentService } from '../../../../service/content.service';

@Component({
  selector: 'app-bank-verification',
  templateUrl: './bank-verification.component.html',
  styleUrls: ['./bank-verification.component.css'],
})
export class BankVerificationComponent implements OnInit, OnDestroy {

  consentId: string | null = null;
  applicationId: string = ''; // 🔥 set from route/localStorage
  sessionId: string = '';
  pollInterval: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private contentService: ContentService,
    private spinner: NgxSpinnerService,
    private toastr: ToastrService
  ) {}
ngOnInit(): void {
  this.getBorrowerSnapshot(() => {

    this.route.queryParams.subscribe(params => {
      const success = params['success'];
      const errorMsg = params['errormsg'];
      const errorCode = params['errorcode'];
      this.consentId = params['id'];

      // ❌ FAIL CASE
      if (success === 'false') {
        this.router.navigate(['/dashboard/loan/error-verification'], {
          queryParams: { errorcode: errorCode, errormsg: errorMsg }
        });
        return;
      }

      // ✅ AFTER REDIRECT
      if (this.consentId) {
        this.checkConsentAndProceed();
      }
    });

  });
}

    // ================= GET APPLICATION ID =================
getBorrowerSnapshot(callback?: () => void) {
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
        this.toastr.error('Application not found');
        return;
      }

      callback && callback(); // ✅ IMPORTANT

    },
    error: () => {
      this.spinner.hide();
      this.toastr.error('Failed to fetch borrower snapshot');
    },
  });
}

  // ================= START FLOW =================
  startBankFlow() {

    const payload = {
      applicationId: this.applicationId,
      redirectUrl: window.location.origin + '/aa/return'
    };

    this.spinner.show();

    this.contentService.createConsent(payload).subscribe({
      next: (res: any) => {
        this.spinner.hide();

        if (!res?.success) {
          this.toastr.error('Failed to create consent');
          return;
        }

        const consentId = res.data.id;

        // 🔥 OPEN SETU PAGE
        window.location.href = `https://fiu-uat.setu.co/v2/consents/webview/${consentId}`;
      },
      error: () => {
        this.spinner.hide();
        this.toastr.error('Consent API failed');
      }
    });
  }

  // ================= CHECK CONSENT =================
checkConsentAndProceed() {

  this.pollInterval = setInterval(() => {

    this.contentService.getConsentStatus(this.consentId).subscribe((res: any) => {

      const status = res?.data?.status;

      if (status === 'ACTIVE') {
        clearInterval(this.pollInterval);
        this.createSession();
      }

      if (status === 'REVOKED' || status === 'EXPIRED') {
        clearInterval(this.pollInterval);
        this.toastr.error('Consent expired, please retry');
      }

    });

  }, 5000);
}
  // ================= CREATE SESSION =================
createSession() {

  const payload = {
    consentId: this.consentId,
    applicationId: this.applicationId
  };

  this.contentService.createSession(payload).subscribe((res: any) => {

    if (!res?.success) {
      this.toastr.error('Session creation failed');
      return;
    }

    this.sessionId = res.data.id;

    this.pollSession();
  });
}

  // ================= POLL SESSION =================
pollSession() {

  this.pollInterval = setInterval(() => {

    this.contentService
      .getSessionStatus(this.sessionId, this.applicationId)
      .subscribe((res: any) => {

        const status = res?.data?.status;

        if (status === 'COMPLETED') {

          clearInterval(this.pollInterval);

          this.toastr.success('Bank statement fetched');

          this.refreshSnapshot(); // 🔥 IMPORTANT

        }

        if (status === 'FAILED') {
          clearInterval(this.pollInterval);
          this.toastr.error('Bank fetch failed');
        }

      });

  }, 12000); // ✅ 10–20 sec correct
}


refreshSnapshot() {

  this.contentService.getBorrowerSnapshot().subscribe((res: any) => {

    if (!res?.success) return;

    const fetched = res?.data?.applicationFlow?.fetchBankStatementContext?.aaDataFetched;

    if (fetched) {
      this.router.navigate(['/dashboard/loan/reference']);
    } else {
      this.toastr.warning('Data not fully fetched yet');
    }

  });
}


  // ================= CLEANUP =================
  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  // ================= OPTIONAL =================
skipProcess() {

  if (!this.applicationId) {
    this.toastr.error('Application ID missing');
    return;
  }

  this.spinner.show();

  this.contentService.skipFetchBankStatement(this.applicationId).subscribe({
    next: (res: any) => {
      this.spinner.hide();

      if (res?.success) {

        this.toastr.success('Step skipped successfully');

        // 🔥 move to next step
        this.router.navigate(['/dashboard/loan']);

      } else {
        this.toastr.error(res?.message || 'Skip failed');
      }
    },
    error: () => {
      this.spinner.hide();
      this.toastr.error('Skip API failed');
    }
  });
}

  reInitiate() {
    this.startBankFlow(); // 🔥 better UX
  }
}