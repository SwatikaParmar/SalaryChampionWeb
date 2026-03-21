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

  journeyMessage = '';
  aaLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private contentService: ContentService,
    private spinner: NgxSpinnerService,
    private toastr: ToastrService
  ) {}

  // ================= INIT =================
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
  this.journeyMessage = 'Resuming bank verification...';
  this.aaLoading = true;

  // 🔥 ALWAYS START FROM CONSENT STATUS API
  this.resumeFlow();
}

      });

    });
  }

  resumeFlow() {

  this.contentService.getConsentStatus(this.consentId!).subscribe((res: any) => {

    if (!res?.success) {
      this.toastr.error('Failed to resume AA flow');
      this.aaLoading = false;
      return;
    }

    const data = res.data;

    console.log('🔁 RESUME FLOW:', data);

    this.handleNextStep(data); // 🔥 DIRECT ENGINE CALL

  }, () => {
    this.aaLoading = false;
  });

}

  // ================= SNAPSHOT =================
  getBorrowerSnapshot(callback?: () => void) {
    this.spinner.show();

    this.contentService.getBorrowerSnapshot().subscribe({
      next: (res: any) => {
        this.spinner.hide();

        if (!res?.success) {
          this.toastr.error('Failed to load borrower');
          return;
        }

        this.applicationId = res.data?.application?.id;

        if (!this.applicationId) {
          this.toastr.error('Application missing');
          return;
        }

        callback?.();
      },
      error: () => {
        this.spinner.hide();
        this.toastr.error('Snapshot failed');
      }
    });
  }

  // ================= START FLOW =================
  startAAFlow() {

    const payload = {
      applicationId: this.applicationId,
      redirectUrl: window.location.origin + '/dashboard/loan/bank-verification'
    };

    this.aaLoading = true;
    this.journeyMessage = 'Creating consent...';

    this.contentService.createConsent(payload).subscribe({
      next: (res: any) => {

        if (!res?.success) {
          this.aaLoading = false;
          return;
        }

        const data = res.data;

        this.consentId = data?.consentId;

        this.handleNextStep(data); // 🔥 CENTRAL ENGINE
      },
      error: () => {
        this.aaLoading = false;
      }
    });
  }

  isProcessingStep = false;

  // ================= CENTRAL ENGINE =================
handleNextStep(data: any) {

  const step = data?.nextStep;

  console.log('NEXT STEP:', step);

  switch (step) {

    case 'OPEN_WEBVIEW':
      this.journeyMessage = 'Redirecting to bank...';
      if (data?.url) window.location.href = data.url;
      break;

    case 'POLL_CONSENT':
      this.pollConsent();
      break;

    case 'CHECK_FETCH_STATUS':
      this.checkFetchStatus();
      break;

    case 'CHECK_SESSIONS':
      this.getSessions();
      break;

    case 'CREATE_SESSION':
      if (data?.shouldCreateSession) {
        this.createSession();
      } else {
        this.onDone();
      }
      break;

    case 'POLL_SESSION':
      this.sessionId = data?.sessionId || data?.latestSessionId;
      this.pollSession();
      break;

    case 'DONE':
      this.onDone();
      break;

    default:
      console.warn('Unknown step:', step);
  }
}

  // ================= CONSENT POLL =================
  pollConsent() {

    this.clearPolling();

    this.journeyMessage = 'Waiting for approval...';

    this.pollInterval = setInterval(() => {

      this.contentService.getConsentStatus(this.consentId!).subscribe((res: any) => {

        if (!res?.success) return;

        const data = res.data;

if (data?.shouldPollConsent) return;
        this.clearPolling();
        this.handleNextStep(data);

      });

    }, 3000);
  }

  // ================= FETCH =================
checkFetchStatus() {

  this.journeyMessage = 'Fetching bank data...';

  setTimeout(() => {

    this.contentService.getFetchStatus(this.consentId!).subscribe((res: any) => {

      this.isProcessingStep = false;

      if (!res?.success) return;

      this.handleNextStep(res.data);

    });

  }, 4000); // ✅ simple delay
}
  // ================= SESSIONS =================
getSessions() {

  this.journeyMessage = 'Checking sessions...';

  setTimeout(() => {

    this.contentService
      .getSessions(this.consentId!, this.applicationId)
      .subscribe((res: any) => {

        this.isProcessingStep = false;

        if (!res?.success) return;

        const data = res.data;

        console.log('SESSION RESPONSE:', data);

        // 🔥 MAIN FIX
        if (data?.hasCompletedSession) {
          this.clearPolling(); // 🔥 STOP EVERYTHING
          this.onDone();       // 🔥 DIRECT DONE
          return;
        }

        if (data?.shouldRecreateConsent) {
          this.startAAFlow();
          return;
        }

        this.handleNextStep(data);

      });

  }, 4000);
}
  // ================= CREATE SESSION =================
async createSession() {

  this.journeyMessage = 'Creating session...';

  await this.delay(2000);

  this.contentService.createSession({
    consentId: this.consentId,
    applicationId: this.applicationId
  }).subscribe((res: any) => {

    this.isProcessingStep = false;

    if (!res?.success) return;

    this.handleNextStep(res.data);

  });
}
  // ================= SESSION POLL =================
pollSession() {

  this.clearPolling();

  this.journeyMessage = 'Processing bank data...';

  this.pollInterval = setInterval(() => {

    this.contentService
      .getSessionStatus(this.sessionId, this.applicationId)
      .subscribe((res: any) => {

        if (!res?.success) return;

        const data = res.data;

        if (data?.shouldPollSession) return;

        this.clearPolling();
        this.handleNextStep(data);

      });

  }, 4000); // ✅ only interval, NO delay inside
}

  // ================= DONE =================
  onDone() {

    this.clearPolling();
    this.aaLoading = false;

    this.journeyMessage = 'Completed ✅';

    this.toastr.success('Bank statement fetched successfully');

    setTimeout(() => {
      this.router.navigate(['/dashboard/loan'], {
        queryParams: { refresh: true }
      });
    }, 1000);
  }

  // ================= CLEANUP =================
  clearPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  ngOnDestroy(): void {
    this.clearPolling();
  }


  delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
}