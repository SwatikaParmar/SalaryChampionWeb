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
  applicationId: string = '';
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
        this.consentId = params['id'];

        if (success === 'false') {
          this.router.navigate(['/dashboard/loan/error-verification']);
          return;
        }

        if (this.consentId) {
          this.pollConsent();
        }

      });

    });
  }


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

      // ✅ callback execute
      if (callback) callback();
    },
    error: () => {
      this.spinner.hide();
      this.toastr.error('Failed to fetch borrower snapshot');
    },
  });
}

  // ================= START =================
  startAAFlow() {

    const payload = {
      applicationId: this.applicationId,
      redirectUrl: window.location.origin + '/dashboard/loan/bank-verification'
    };

    this.spinner.show();

    this.contentService.createConsent(payload).subscribe({
      next: (res: any) => {
        this.spinner.hide();

        if (!res?.success) return;

        this.consentId = res.data?.consentId;

        const shouldOpen = res.data?.shouldOpenWebview;
        const url = res.data?.url;

        if (shouldOpen && url) {
          window.location.href = url;
        } else {
          this.pollConsent();
        }
      }
    });
  }

  // ================= CONSENT =================
pollConsent() {

  this.clearPolling();

  this.pollInterval = setInterval(() => {

    this.contentService.getConsentStatus(this.consentId!).subscribe((res: any) => {

      const step = res?.data?.nextStep;

      console.log('CONSENT STEP:', step);

      if (step === 'POLL_CONSENT') return;

      this.clearPolling();

      if (step === 'CHECK_FETCH_STATUS') {
        this.checkFetchStatus(); // ✅ correct
      }

      if (step === 'RECREATE_CONSENT') {
        this.startAAFlow();
      }

    });

  }, 3000);
}

  // ================= FETCH =================
checkFetchStatus() {

  this.contentService.getFetchStatus(this.consentId!).subscribe((res: any) => {

    const step = res?.data?.nextStep;

    console.log('FETCH STEP:', step);

    // ✅ go to sessions
    if (step === 'CHECK_SESSIONS') {
      this.getSessions();
    }

    // 🔥 IMPORTANT FIX
    if (step === 'CREATE_SESSION') {
      this.createSession();
    }

    // optional safe fallback
    if (step === 'DONE') {
      this.onDone();
    }

  });
}

  // ================= SESSIONS =================
getSessions() {

  this.contentService.getSessions(this.consentId!).subscribe((res: any) => {

    const step = res?.data?.nextStep;

    console.log('SESSION LIST STEP:', step);

    if (step === 'DONE') {
      this.onDone();
    }

    if (step === 'CREATE_SESSION') {
      this.createSession();
    }

    if (step === 'POLL_SESSION') {
      this.sessionId = res?.data?.latestSessionId;
      this.pollSession();
    }

  });
}

  // ================= CREATE SESSION =================
  createSession() {

    this.contentService.createSession({
      consentId: this.consentId
    }).subscribe((res: any) => {

      if (!res?.success) return;

      this.sessionId = res.data?.sessionId;

      this.pollSession();
    });
  }

  // ================= SESSION POLLING =================
  pollSession() {

    this.clearPolling();

    this.pollInterval = setInterval(() => {

      this.contentService
        .getSessionStatus(this.sessionId, this.applicationId)
        .subscribe((res: any) => {

          const step = res?.data?.nextStep;

          if (step === 'POLL_SESSION') return;

          this.clearPolling();

          if (step === 'DONE') {
            this.onDone();
          }

          if (step === 'CREATE_SESSION') {
            this.createSession(); // retry
          }

        });

    }, 3000);
  }

  // ================= DONE =================
  onDone() {
    this.toastr.success('Bank statement fetched ✅');

    this.router.navigate(['/dashboard/loan'], {
      queryParams: { refresh: true }
    });
  }

  // ================= COMMON =================
  clearPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  ngOnDestroy(): void {
    this.clearPolling();
  }
}