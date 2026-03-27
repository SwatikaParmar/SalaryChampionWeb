import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContentService } from '../../../service/content.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {

  // flags
  isProfileComplete = false;

  // progress values
  profileProgress = 0;
  loanProgress = 0;
  overallProgress = 0;


  isEligible: boolean = true;
  hasEvaluatedEligibility = false;
  ineligibleReason: string = '';
  retryDate: string = '';

trackingSteps: any = {};
currentTitle: string = '';
currentMessage: string = '';

hasActiveApplication: boolean = false;


showLoanCard: boolean = false;
showTracker: boolean = false;

showKycModal: boolean = false;
kycUrl: string = '';
kycUrlSafe!: SafeResourceUrl;
  creditManager: any;
  to: any;


    isReloanJourney = false;
  steps: any = {};
  currentLoanRequest: any;

  loanTracking: any;
  applicationId: string = '';

  get showReloanActionButton(): boolean {
    return (
      this.loanTracking?.showReloanCard === true &&
      !!this.loanTracking?.nextAction?.url
    );
  }

  constructor(
    private router: Router,
    private contentService: ContentService,
    private spinner: NgxSpinnerService,   // ✅ spinner inject
      private sanitizer: DomSanitizer,
      private toastr : ToastrService

  ) {}

  ngOnInit(): void {
    this.getBorrowerSnapshot();
  }

  showActiveLoanCard: boolean = false;
  activeLoan: any = null;

getBorrowerSnapshot() {
  this.spinner.show();

  this.contentService.getBorrowerSnapshot().subscribe({
    next: (res: any) => {
      this.spinner.hide();

      if (!res?.success) return;

      const data = res?.data || {};
      const offer = data?.offer || {};
      const eligibility = data?.eligibility || {};

      this.applicationId = data?.application?.id || '';
      this.profileProgress = data?.basicFlow?.percent || 0;
      this.loanProgress = data?.applicationFlow?.percent || 0;
      this.overallProgress = data?.progressPercent || 0;
      this.loanTracking = data?.loanTracking || null;
      this.isReloanJourney = !!(data?.isReloanJourney || data?.applicationFlow?.isReloanJourney);
      this.steps = data?.applicationFlow?.steps || {};
      this.currentLoanRequest = data?.currentLoanRequest || null;
      this.applyEligibilityState(offer, eligibility);

      const creditManagerDetail =
        this.loanTracking?.creditManagerDetail ||
        this.loanTracking?.assignedRoleDetails?.find((role: any) => role?.roleCode === 'CREDIT_MANAGER') ||
        this.loanTracking?.assignedRoleDetails?.[0];

      this.creditManager = creditManagerDetail ? {
        name: creditManagerDetail?.name,
        mobile: creditManagerDetail?.phone || creditManagerDetail?.contact,
        email: creditManagerDetail?.email,
        role: creditManagerDetail?.roleName
      } : null;

      this.showTracker = this.loanProgress === 100;
      this.patchTrackerFromSnapshot();
      this.patchActiveLoanFromSnapshot();

      this.showLoanCard =
        !this.showActiveLoanCard &&
        this.isEligible &&
        this.profileProgress === 100 &&
        this.loanProgress < 100;

      if (this.showTracker) {
        this.applicationStatusApi();
      }
    },
    error: () => {
      this.spinner.hide();
    }
  });
}

private applyEligibilityState(offer: any, eligibility: any) {
  const ineligible = offer?.ineligible || {};
  const decision =
    eligibility?.decision ||
    eligibility?.eligibilityDecision ||
    ineligible?.decision ||
    offer?.decision ||
    offer?.eligibilityDecision ||
    offer?.status ||
    '';
  const normalizedDecision = typeof decision === 'string' ? decision.toUpperCase() : '';
  const hasEvaluated =
    eligibility?.hasEvaluatedEligibilityOnce === true ||
    offer?.hasEvaluatedEligibilityOnce === true ||
    !!normalizedDecision;
  const rawEligible =
    typeof eligibility?.isEligible === 'boolean'
      ? eligibility.isEligible
      : offer?.isEligible;

  this.hasEvaluatedEligibility = hasEvaluated;

  if (!hasEvaluated) {
    this.isEligible = true;
    this.ineligibleReason = '';
    this.retryDate = '';
    return;
  }

  this.isEligible =
    typeof rawEligible === 'boolean'
      ? rawEligible
      : normalizedDecision !== 'NOT_ELIGIBLE';
  this.ineligibleReason =
    this.mapIneligibleReason(eligibility?.reasons || ineligible?.reasons) ||
    eligibility?.reason ||
    eligibility?.message ||
    eligibility?.ineligibleReason ||
    ineligible?.reason ||
    ineligible?.message ||
    ineligible?.ineligibleReason ||
    offer?.reason ||
    offer?.message ||
    offer?.ineligibleReason ||
    '';
  this.retryDate =
    eligibility?.nextEligibilityAllowedOn ||
    ineligible?.retryAfter ||
    eligibility?.retryDate ||
    eligibility?.retryAt ||
    eligibility?.nextEligibleAt ||
    offer?.retryDate ||
    offer?.retryAt ||
    offer?.nextEligibleAt ||
    '';
}

private mapIneligibleReason(reasons: string[] = []): string {
  if (!Array.isArray(reasons) || reasons.length === 0) return '';

  const reasonMap: Record<string, string> = {
    COOLDOWN_ACTIVE: 'Retry window is active right now.'
  };

  return reasons
    .map((reason) => reasonMap[reason] || reason.replace(/_/g, ' '))
    .join(', ');
}

private patchTrackerFromSnapshot() {
  const snapshotSteps = this.loanTracking?.steps;
  if (!snapshotSteps) return;

  this.trackingSteps = snapshotSteps;
  this.currentTitle =
    this.loanTracking?.currentTitle ||
    this.loanTracking?.currentStage ||
    this.currentTitle;
  this.currentMessage =
    this.loanTracking?.currentMessage ||
    this.currentMessage;
}

private patchActiveLoanFromSnapshot() {
  const tracking = this.loanTracking || {};
  const activeLoan = tracking?.activeLoan || {};
  const repayment = tracking?.repayment || {};

  this.showActiveLoanCard = tracking?.showActiveLoanCard === true;

  if (!this.showActiveLoanCard) {
    this.activeLoan = null;
    return;
  }

  this.activeLoan = {
    loanNumber: tracking?.applicationNumber || tracking?.loanAccountNo || tracking?.loanId,
    status: tracking?.loanStatus || activeLoan?.status || 'ACTIVE',
    approvedAmount: activeLoan?.approvedAmount || tracking?.approvedAmount || activeLoan?.principal,
    netDisbursalAmount: activeLoan?.netDisbursalAmount || tracking?.netDisbursalAmount,
    outstandingAmount: repayment?.outstandingAmount || tracking?.outstandingAmount || repayment?.principalOutstanding,
    repayAmount: repayment?.repayAmount || activeLoan?.repayAmount || tracking?.repayAmount,
    nextDueAmount: repayment?.nextDueAmount || tracking?.nextDueAmount || repayment?.minimumDueAmount,
    nextDueDateDisplay: repayment?.nextDueDate || tracking?.nextDueDate || activeLoan?.repayDate,
    repayDateDisplay: activeLoan?.repayDate || tracking?.repayDate || activeLoan?.maturityDate,
    disbursalDateDisplay: activeLoan?.disbursalDate || tracking?.disbursalDate || activeLoan?.startedOn,
    autoDebitStatus: repayment?.autoDebitStatus || tracking?.autoDebitStatus || tracking?.mandateStatus
  };
}



  // ================= RELOAN CLICK =================
  applyReloan() {
    const url = this.loanTracking?.nextAction?.url;

    if (!url) {
      this.toastr.error('Reloan link missing');
      return;
    }

    // 🔥 TOKEN EXTRACT
    const token = this.getQueryParam(url, 'token');
    const applicationId = this.getQueryParam(url, 'applicationId');

    if (!token || !applicationId) {
      this.toastr.error('Invalid reloan URL');
      return;
    }

    this.consumeReloan(applicationId, token);
  }

  // ================= CONSUME API =================
  consumeReloan(applicationId: string, token: string) {
    this.spinner.show();

    const payload = {
      applicationId,
      reloanToken: token
    };

    this.contentService.reloanConsume(payload).subscribe({
      next: (res: any) => {
        this.spinner.hide();

        if (res?.success) {
          this.toastr.success('Reloan started 🚀');

          // 🔥 REFRESH SNAPSHOT
          this.getBorrowerSnapshot();
        }
      },
      error: () => {
        this.spinner.hide();
        this.toastr.error('Reloan failed');
      }
    });
  }

  // ================= HELPERS =================
  getQueryParam(url: string, key: string): string | null {
    const params = new URL(url).searchParams;
    return params.get(key);
  }

  // ================= RELOAN STEPS =================
  openBankStatement() {
    this.toastr.info('Start Bank Statement');
  }

  openBankForm() {
    this.toastr.info('Open Bank Details');
  }


getStepIcon(step: string, status: string) {

  // ✅ DONE → green tick
  if (status === 'DONE') return 'fa-check';

  // 🔒 LOCKED → lock icon
  if (status === 'LOCKED') return 'fa-lock';

  // 🟡 PENDING → step wise icon
  switch (step) {
    case 'applicationSubmitted': return 'fa-file';
    case 'applicationInReview': return 'fa-user-check';
    case 'videoKyc': return 'fa-video';
    case 'sanction': return 'fa-landmark';
    case 'esign': return 'fa-file-signature';

    // 🔥 ADD THIS
    case 'enach': return 'fa-building-columns';  // or fa-university / fa-bank

    case 'disbursement': return 'fa-indian-rupee-sign';

    default: return 'fa-circle';
  }
}


getStepClass(status: string) {
  if (status === 'DONE') return 'done';
  if (status === 'PENDING') return 'active';
  return 'locked';
}


videoKycData: any = null;

applicationStatusApi() {
  if (!this.applicationId) return;

  this.spinner.show();

  this.contentService.applicationStatus(this.applicationId).subscribe({
    next: (res: any) => {
      this.spinner.hide();

      if (!res?.success) return;

      const data = res?.data || {};
      this.trackingSteps = data?.steps || this.trackingSteps || {};
      this.currentTitle =
        data?.borrowerGuidance?.title ||
        this.loanTracking?.currentTitle ||
        this.loanTracking?.currentStage ||
        '';
      this.currentMessage =
        data?.borrowerGuidance?.message ||
        this.loanTracking?.currentMessage ||
        '';
      this.videoKycData = data?.videoKyc;
    },
    error: () => {
      this.spinner.hide();
      console.error('Application status failed');
    }
  });
}
async startVideoKyc() {
  if (!this.applicationId) return;

  // ✅ पहले permission लो
  const allowed = await this.ensureLocationAccess();
  if (!allowed) return;

  this.spinner.show();

  this.contentService.startVideoKyc({
    applicationId: this.applicationId
  }).subscribe({
    next: (res: any) => {
      this.spinner.hide();

      const url = res?.data?.videoKyc?.customerUrl;

      if (res?.success && url) {

        this.kycUrl = url;
        this.kycUrlSafe =
          this.sanitizer.bypassSecurityTrustResourceUrl(url);

        this.showKycModal = true;

      } else {
        this.toastr.error('KYC URL not found');
      }
    },
    error: () => {
      this.spinner.hide();
      this.toastr.error('Video KYC failed');
    }
  });
}


async ensureLocationAccess(): Promise<boolean> {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      () => {
        this.toastr.error('Please allow location to continue KYC');
        resolve(false);
      }
    );
  });
}

onVideoKycClick() {
decodeURI
  // ❌ agar locked hai toh kuch mat karo
  if (this.trackingSteps?.videoKyc === 'LOCKED') return;

  // ✅ agar already done hai toh bhi kuch mat karo
  if (this.trackingSteps?.videoKyc === 'DONE') return;

  // ✅ sirf PENDING pe call karo
  if (this.trackingSteps?.videoKyc === 'PENDING') {
    this.startVideoKyc();
  }
}

requestLocationPermission(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      this.toastr.error('Location not supported');
      resolve(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('Location allowed:', pos.coords);
        resolve(true);
      },
      (err) => {
        console.error('Location denied', err);

        this.to.error('Please allow location for Video KYC');

        resolve(false);
      }
    );
  });
}

closeKycModal() {
  this.showKycModal = false;

  // 🔥 CALL REFRESH API
  this.videoKycRefresh();
}

videoKycRefresh() {
  if (!this.applicationId) return;

  const payload = {
    applicationId: this.applicationId
  };

  this.contentService.videoRefresh(payload).subscribe({
    next: (res: any) => {
      console.log('KYC refreshed');

      // 🔥 TRACKER UPDATE AGAIN
      this.applicationStatusApi();
    },
    error: () => {
      console.error('Refresh failed');
    }
  });
}



showSanctionModal: boolean = false;
sanctionUrl: string = '';
sanctionUrlSafe!: SafeResourceUrl;

otpData: any = null;
enteredOtp: any;

openSanctionLetter() {

  if (!this.applicationId) return;

  this.spinner.show();

  this.contentService.sanctionEsignLink(this.applicationId).subscribe({
    next: async (res: any) => {

      const url = res?.data?.sanctionLetterUrl;

      if (!url) {
        this.spinner.hide();
        return;
      }

      try {
        // 🔥 FETCH FILE
        const response = await fetch(url);

        const blob = await response.blob();

        const blobUrl = URL.createObjectURL(blob);

        // 🔥 SAFE URL FOR IFRAME
        this.sanctionUrlSafe =
          this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);

        this.showSanctionModal = true;

        this.otpData = res?.data?.otp;

      } catch (e) {
        console.error(e);
      }

      this.spinner.hide();
    },

    error: () => {
      this.spinner.hide();
    }
  });
}

acceptSanction(otp: string) {

  const payload = {
    applicationId: this.applicationId,
    otpCode: otp
  };

  this.spinner.show();

  this.contentService.acceptSanction(payload).subscribe({
    next: (res: any) => {
      this.spinner.hide();

      if (res?.success) {

        this.showSanctionModal = false;

        // 🔥 refresh tracker
        this.applicationStatusApi();

      }
    },
    error: () => {
      this.spinner.hide();
    }
  });
}




showEsignModal: boolean = false;
esignUrlSafe!: SafeResourceUrl;
esignUrl: string = '';

openEsign() {
  if (!this.applicationId) return;

  this.spinner.show();

  this.contentService.esignLink(this.applicationId).subscribe({
    next: (res: any) => {
      this.spinner.hide();

      const url = res?.data?.esignUrl || res?.data?.redirectUrl;

      if (res?.success && url) {

        // ⚠️ same issue like sanction (iframe block ho sakta hai)
        this.esignUrl = url;
        this.esignUrlSafe =
          this.sanitizer.bypassSecurityTrustResourceUrl(url);

        this.showEsignModal = true;

        // 👉 fallback (recommended)
        // window.open(url, '_blank');

      } else {
        console.error('eSign URL not found');
      }
    },
    error: () => {
      this.spinner.hide();
    }
  });
}


closeEsignModal() {
  this.showEsignModal = false;

  // 🔥 refresh tracker
  this.applicationStatusApi();
}

openEsignInNewTab() {
  if (this.esignUrl) {
    window.open(this.esignUrl, '_blank');
  }
}
showEnachModal: boolean = false;
enachUrlSafe!: SafeResourceUrl;
enachUrl: string = '';

mandateRowId: string = '';

openEnach() {
  if (!this.applicationId) return;

  const payload = {
    applicationId: this.applicationId
  };

  this.spinner.show();

  this.contentService.createMandate(payload).subscribe({
    next: (res: any) => {
      this.spinner.hide();

      if (!res?.success) return;

      const url = res?.data?.authUrl;

      // 🔥 STORE mandateRowId
      this.mandateRowId = res?.data?.mandateRowId;

      if (url) {
        this.enachUrl = url;

        this.enachUrlSafe =
          this.sanitizer.bypassSecurityTrustResourceUrl(url);

        this.showEnachModal = true;

      } else {
        console.error('Mandate URL not found');
      }
    },
    error: () => {
      this.spinner.hide();
    }
  });
}


verifyEnach() {
  if (!this.mandateRowId) {
    console.error('Mandate ID missing');
    return;
  }

  const payload = {
    mandateRowId: this.mandateRowId
  };

  this.spinner.show();

  this.contentService.mendateRefresh(payload).subscribe({
    next: (res: any) => {
      this.spinner.hide();

      if (!res?.success) return;

      // ✅ modal close
      this.showEnachModal = false;

      // 🔥 tracker refresh
      this.applicationStatusApi();

    },
    error: () => {
      this.spinner.hide();
      console.error('Mandate refresh failed');
    }
  });
}



openEnachInNewTab() {
  if (this.enachUrl) {
    window.open(this.enachUrl, '_blank');
  }
}

isLoanCompleted: boolean = false;

setDashboardFlags(data: any) {

  this.isLoanCompleted =
    this.loanProgress === 100 &&
    data?.loanTracking?.showActiveLoanCard === true;

}


refreshStatus() {
  this.applicationStatusApi(); // or your API method
}

openRepayment(): void {
  if (!this.applicationId) {
    this.toastr.error('Application not found');
    return;
  }

  this.router.navigate(['/dashboard/profile/loan-repay', this.applicationId]);
}

}



