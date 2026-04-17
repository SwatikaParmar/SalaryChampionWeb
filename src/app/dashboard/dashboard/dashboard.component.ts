
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ContentService } from '../../../service/content.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
import { getFirstApiErrorMessage } from '../../../service/api-error.util';
import { formatDateForDisplay } from '../../shared/date-format.util';
import { Subscription } from 'rxjs';
import { DashboardRefreshService } from '../dashboard-refresh.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly closedLoanStatuses = [
    'CLOSED',
    'COMPLETED',
    'PAID',
    'REPAID',
    'SETTLED',
    'FORECLOSED',
    'FORECLOSURE',
    'LOAN_CLOSED',
    'CLOSE_LOAN'
  ];
  private readonly enachMandateStorageKey = 'dashboard.enachMandateRowId';
  private readonly videoKycPendingStorageKey = 'dashboard.videoKycPending';
  private readonly refreshRetryDelayMs = 1500;
  private readonly refreshRetryAttempts = 3;
  private readonly videoKycReturnRefreshCooldownMs = 1500;
  private readonly defaultTrackerFlow = [
    'applicationSubmitted',
    'applicationInReview',
    'videoKyc',
    'sanction',
    'esign',
    'enach',
    'disbursement'
  ];
  private readonly trackerFlowKeyMap: Record<string, string> = {
    APPLICATION_SUBMITTED: 'applicationSubmitted',
    APPLICATION_IN_REVIEW: 'applicationInReview',
    VIDEO_KYC: 'videoKyc',
    SANCTION: 'sanction',
    ESIGN: 'esign',
    ENACH: 'enach',
    DISBURSEMENT: 'disbursement'
  };

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
trackerFlow: string[] = [...this.defaultTrackerFlow];
currentTitle: string = '';
currentMessage: string = '';

hasActiveApplication: boolean = false;


  showLoanCard: boolean = false;
  showTracker: boolean = false;
  private hasAutoTriggeredEnachRefresh = false;
  private enachWindowPollTimer: ReturnType<typeof setInterval> | null = null;
  private videoKycWindowPollTimer: ReturnType<typeof setInterval> | null = null;
  private dashboardRefreshTimeouts: ReturnType<typeof setTimeout>[] = [];
  private queryParamSubscription: Subscription | null = null;
  private hasPendingVideoKycRefresh = false;
  private isVideoKycRefreshInFlight = false;
  private lastVideoKycRefreshTriggerAt = 0;

showKycModal: boolean = false;
kycUrl: string = '';
kycUrlSafe!: SafeResourceUrl;
videoKycCustomerUrl: string = '';
videoKycModalMessage: string = '';
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

  get showClosedLoanUnavailableCard(): boolean {
    return (
      this.profileProgress === 100 &&
      this.hasClosedLoan() &&
      this.hasExplicitReloanUnavailableFlag()
    );
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private contentService: ContentService,
    private spinner: NgxSpinnerService,   // ✅ spinner inject
      private sanitizer: DomSanitizer,
      private toastr : ToastrService,
      private dashboardRefreshService: DashboardRefreshService

  ) {}

  ngOnInit(): void {
    this.restorePendingEnachMandateRowId();
    this.restorePendingVideoKycRefresh();
    this.getBorrowerSnapshot();
    this.listenForDashboardRefreshRequests();
  }

  ngOnDestroy(): void {
    this.clearEnachWindowPollTimer();
    this.clearVideoKycWindowPollTimer();
    this.clearDashboardRefreshTimeouts();
    this.queryParamSubscription?.unsubscribe();
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
      this.videoKycCustomerUrl =
        data?.videoKycCustomerUrl ||
        data?.journeyLinks?.videoKycCustomerUrl ||
        data?.journey?.links?.videoKycCustomerUrl ||
        data?.journey?.journeyLinks?.videoKycCustomerUrl ||
        this.loanTracking?.videoKycCustomerUrl ||
        this.loanTracking?.journeyLinks?.videoKycCustomerUrl ||
        this.loanTracking?.journey?.links?.videoKycCustomerUrl ||
        this.loanTracking?.journey?.journeyLinks?.videoKycCustomerUrl ||
        this.loanTracking?.nextAction?.url ||
        this.loanTracking?.videoKyc?.customerUrl ||
        '';
      this.isReloanJourney = !!(data?.isReloanJourney || data?.applicationFlow?.isReloanJourney);
      this.steps = data?.applicationFlow?.steps || {};
      this.updateTrackerFlow(
        this.loanTracking?.statusFlow ||
        data?.applicationFlow?.statusFlow ||
        data?.statusFlow
      );
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
      this.syncPendingVideoKycRefresh();
      this.patchActiveLoanFromSnapshot();
      this.clearPendingEnachMandateIfCompleted(this.trackingSteps);

      this.showLoanCard =
        !this.showActiveLoanCard &&
        this.isEligible &&
        this.profileProgress === 100 &&
        this.loanProgress < 100;

      if (this.showTracker) {
        if (!this.tryAutoRefreshEnachStatus()) {
          this.applicationStatusApi();
        }
      }
    },
    error: () => {
      this.spinner.hide();
    }
  });
}

private listenForDashboardRefreshRequests() {
  this.queryParamSubscription = this.route.queryParamMap.subscribe((params) => {
    if (params.get('refresh') !== 'true') {
      return;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { refresh: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });

    this.refreshDashboardSnapshot();
  });
}

private refreshDashboardSnapshot() {
  this.clearDashboardRefreshTimeouts();

  for (let attempt = 0; attempt < this.refreshRetryAttempts; attempt++) {
    const timeout = setTimeout(() => {
      this.dashboardRefreshService.requestRefresh();
      this.getBorrowerSnapshot();
    }, attempt * this.refreshRetryDelayMs);

    this.dashboardRefreshTimeouts.push(timeout);
  }
}

private clearDashboardRefreshTimeouts() {
  this.dashboardRefreshTimeouts.forEach((timeout) => clearTimeout(timeout));
  this.dashboardRefreshTimeouts = [];
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
  const snapshotSteps = this.loanTracking?.steps || this.steps;
  if (!snapshotSteps || Object.keys(snapshotSteps).length === 0) return;

  this.trackingSteps = this.buildTrackerSteps(snapshotSteps);
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
  const isDisbursementDone = this.isDisbursementCompleted();

  this.showActiveLoanCard =
    tracking?.showActiveLoanCard === true &&
    isDisbursementDone;

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
    nextDueDateDisplay: formatDateForDisplay(repayment?.nextDueDate || tracking?.nextDueDate || activeLoan?.repayDate),
    repayDateDisplay: formatDateForDisplay(activeLoan?.repayDate || tracking?.repayDate || activeLoan?.maturityDate),
    disbursalDateDisplay: formatDateForDisplay(activeLoan?.disbursalDate || tracking?.disbursalDate || activeLoan?.startedOn),
    autoDebitStatus: repayment?.autoDebitStatus || tracking?.autoDebitStatus || tracking?.mandateStatus
  };
}

private isDisbursementCompleted(): boolean {
  const disbursementStatus =
    this.trackingSteps?.disbursement ||
    this.loanTracking?.steps?.disbursement ||
    this.steps?.disbursement;

  return this.normalizeTrackerStatus(disbursementStatus) === 'DONE';
}

private hasClosedLoan(): boolean {
  const tracking = this.loanTracking || {};
  const activeLoan = tracking?.activeLoan || {};
  const request = this.currentLoanRequest || {};
  const statusCandidates = [
    tracking?.loanStatus,
    activeLoan?.status,
    activeLoan?.loanStatus,
    request?.loanStatus,
    request?.status,
    tracking?.repayment?.loanStatus
  ];
  const statusClosed = statusCandidates.some((status) => this.isClosedLoanStatus(status));

  return statusClosed ||
    tracking?.isLoanClosed === true ||
    tracking?.loanClosed === true ||
    activeLoan?.isClosed === true ||
    activeLoan?.closed === true ||
    request?.isClosed === true ||
    request?.closed === true;
}

private hasExplicitReloanUnavailableFlag(): boolean {
  const tracking = this.loanTracking || {};
  const request = this.currentLoanRequest || {};

  const booleanCandidates = [
    tracking?.showReloanCard,
    tracking?.isReloanEligible,
    tracking?.reloanEligible,
    tracking?.isReloanAvailable,
    tracking?.reloanAvailable,
    request?.showReloanCard,
    request?.isReloanEligible,
    request?.reloanEligible,
    request?.isReloanAvailable,
    request?.reloanAvailable
  ];

  const hasExplicitFalseFlag = booleanCandidates.some((value) => value === false);

  return hasExplicitFalseFlag || (
    this.hasEvaluatedEligibility &&
    !this.isEligible &&
    !this.showReloanActionButton
  );
}

private isClosedLoanStatus(status: any): boolean {
  if (typeof status !== 'string') {
    return false;
  }

  const normalizedStatus = status.trim().toUpperCase().replace(/\s+/g, '_');
  return this.closedLoanStatuses.includes(normalizedStatus);
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
          return;
        }

        const errorMessage = getFirstApiErrorMessage(res);
        if (errorMessage) {
          this.toastr.error(errorMessage);
        }
      },
      error: (err) => {
        this.spinner.hide();
        const errorMessage = getFirstApiErrorMessage(err);
        if (errorMessage) {
          this.toastr.error(errorMessage);
        }
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
  const normalizedStatus = this.normalizeTrackerStatus(status);

  // ✅ DONE → green tick
  if (normalizedStatus === 'DONE') return 'fa-check';

  // 🔒 LOCKED → lock icon
  if (normalizedStatus === 'LOCKED') return 'fa-lock';

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
  const normalizedStatus = this.normalizeTrackerStatus(status);

  if (normalizedStatus === 'DONE') return 'done';
  if (normalizedStatus === 'PENDING') return 'active';
  return 'locked';
}

private updateTrackerFlow(flow: any) {
  const normalizedFlow = Array.isArray(flow)
    ? flow
        .map((step) => this.normalizeTrackerStepKey(step))
        .filter((step): step is string => !!step)
    : [];

  const mergedFlow = [...normalizedFlow];

  this.defaultTrackerFlow.forEach((step) => {
    if (!mergedFlow.includes(step)) {
      mergedFlow.push(step);
    }
  });

  this.trackerFlow = mergedFlow.length
    ? mergedFlow
    : [...this.defaultTrackerFlow];
}

private normalizeTrackerStepKey(step: any): string | null {
  if (typeof step !== 'string') return null;

  const normalizedStep = step.trim();
  return this.trackerFlowKeyMap[normalizedStep.toUpperCase()] || normalizedStep;
}

private normalizeTrackerStatus(status: any): 'DONE' | 'PENDING' | 'LOCKED' {
  if (typeof status !== 'string') return 'LOCKED';

  switch (status.trim().toUpperCase()) {
    case 'DONE':
    case 'COMPLETED':
    case 'COMPLETE':
    case 'SUCCESS':
      return 'DONE';

    case 'PENDING':
    case 'ACTIVE':
    case 'IN_PROGRESS':
    case 'INPROGRESS':
    case 'CURRENT':
      return 'PENDING';

    default:
      return 'LOCKED';
  }
}

private buildTrackerSteps(steps: any): Record<string, 'DONE' | 'PENDING' | 'LOCKED'> {
  const normalizedSteps: Record<string, 'DONE' | 'PENDING' | 'LOCKED'> = {};

  if (steps && typeof steps === 'object') {
    Object.keys(steps).forEach((stepKey) => {
      const normalizedStepKey = this.normalizeTrackerStepKey(stepKey);

      if (!normalizedStepKey) return;

      normalizedSteps[normalizedStepKey] = this.normalizeTrackerStatus(steps[stepKey]);
    });
  }

  const flow = this.trackerFlow?.length ? this.trackerFlow : this.defaultTrackerFlow;

  flow.forEach((stepKey) => {
    if (!normalizedSteps[stepKey]) {
      normalizedSteps[stepKey] = 'LOCKED';
    }
  });

  return normalizedSteps;
}

shouldShowTrackerStep(stepKey: string): boolean {
  const flow = this.trackerFlow?.length ? this.trackerFlow : this.defaultTrackerFlow;
  return flow.includes(stepKey);
}

canOpenTrackerStep(stepKey: string): boolean {
  return this.shouldShowTrackerStep(stepKey) && this.normalizeTrackerStatus(this.trackingSteps?.[stepKey]) === 'PENDING';
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
      this.updateTrackerFlow(data?.statusFlow || this.loanTracking?.statusFlow);
      this.trackingSteps = this.buildTrackerSteps(data?.steps || this.trackingSteps || {});
      this.syncPendingVideoKycRefresh();
      this.patchActiveLoanFromSnapshot();
      this.clearPendingEnachMandateIfCompleted(this.trackingSteps);
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
  if (!this.videoKycCustomerUrl) {
    this.toastr.error('KYC URL not found');
    return;
  }

  this.spinner.show();
  this.markPendingVideoKycRefresh();
  const videoKycWindow = this.openVideoKycInNewTab();
  if (!videoKycWindow) {
    this.clearPendingVideoKycRefresh();
    this.spinner.hide();
    return;
  }

  try {
    const allowed = await this.ensureLocationAccess();
    if (!allowed) {
      this.closeVideoKycWindow(videoKycWindow);
      this.clearPendingVideoKycRefresh();
      return;
    }
  } finally {
    this.spinner.hide();
  }
}

@HostListener('window:focus')
onWindowFocus() {
  this.tryRefreshVideoKycOnReturn();
}

@HostListener('document:visibilitychange')
onDocumentVisibilityChange() {
  if (typeof document === 'undefined' || document.visibilityState !== 'visible') {
    return;
  }

  this.tryRefreshVideoKycOnReturn();
}


async ensureLocationAccess(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      this.toastr.error('Location not supported');
      resolve(false);
      return;
    }

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
  const videoKycStatus = this.normalizeTrackerStatus(this.trackingSteps?.videoKyc);
  // ❌ agar locked hai toh kuch mat karo
  if (videoKycStatus === 'LOCKED') return;

  // ✅ agar already done hai toh bhi kuch mat karo
  if (videoKycStatus === 'DONE') return;

  // ✅ sirf PENDING pe call karo
  if (videoKycStatus === 'PENDING') {
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
  this.kycUrl = '';
  this.videoKycModalMessage = '';
  this.kycUrlSafe = this.sanitizer.bypassSecurityTrustResourceUrl('about:blank');

  // 🔥 CALL REFRESH API
//  this.videoKycRefresh();
}

private buildVideoKycModalUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    parsedUrl.searchParams.set('_modalReload', Date.now().toString());
    return parsedUrl.toString();
  } catch {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_modalReload=${Date.now()}`;
  }
}

private openVideoKycInNewTab(): Window | null {
  const videoKycUrl = this.buildVideoKycModalUrl(this.videoKycCustomerUrl);
  const videoKycWindow = window.open(videoKycUrl, '_blank');

  if (videoKycWindow) {
    try {
      videoKycWindow.opener = null;
    } catch {
      // Ignore browser restrictions while still continuing the KYC flow.
    }
    this.monitorVideoKycWindow(videoKycWindow);
  } else {
    this.toastr.error('Please allow popups to continue Video KYC');
  }

  return videoKycWindow;
}

private monitorVideoKycWindow(videoKycWindow: Window) {
  this.clearVideoKycWindowPollTimer();

  this.videoKycWindowPollTimer = setInterval(() => {
    if (!videoKycWindow.closed) return;

    this.clearVideoKycWindowPollTimer();
    this.videoKycRefresh();
  }, 1500);
}

private clearVideoKycWindowPollTimer() {
  if (this.videoKycWindowPollTimer) {
    clearInterval(this.videoKycWindowPollTimer);
    this.videoKycWindowPollTimer = null;
  }
}

private closeVideoKycWindow(videoKycWindow?: Window | null) {
  if (videoKycWindow && !videoKycWindow.closed) {
    videoKycWindow.close();
  }
}

videoKycRefresh() {
  if (!this.applicationId || this.isVideoKycRefreshInFlight) return;

  const payload = {
    applicationId: this.applicationId
  };

  this.isVideoKycRefreshInFlight = true;

  this.contentService.videoRefresh(payload).subscribe({
    next: (res: any) => {
      console.log('KYC refreshed');

      // 🔥 TRACKER UPDATE AGAIN
      this.applicationStatusApi();
      this.isVideoKycRefreshInFlight = false;
    },
    error: () => {
      this.isVideoKycRefreshInFlight = false;
      console.error('Refresh failed');
    }
  });
}

private tryRefreshVideoKycOnReturn() {
  if (!this.hasPendingVideoKycRefresh || !this.applicationId) {
    return;
  }

  const now = Date.now();
  if (now - this.lastVideoKycRefreshTriggerAt < this.videoKycReturnRefreshCooldownMs) {
    return;
  }

  this.lastVideoKycRefreshTriggerAt = now;
  this.videoKycRefresh();
}

private markPendingVideoKycRefresh() {
  this.hasPendingVideoKycRefresh = true;

  if (!this.canUseSessionStorage()) return;

  sessionStorage.setItem(this.videoKycPendingStorageKey, 'true');
}

private restorePendingVideoKycRefresh() {
  if (!this.canUseSessionStorage()) return;

  this.hasPendingVideoKycRefresh =
    sessionStorage.getItem(this.videoKycPendingStorageKey) === 'true';
}

private clearPendingVideoKycRefresh() {
  this.hasPendingVideoKycRefresh = false;

  if (!this.canUseSessionStorage()) return;

  sessionStorage.removeItem(this.videoKycPendingStorageKey);
}

private syncPendingVideoKycRefresh() {
  const videoKycStatus = this.normalizeTrackerStatus(this.trackingSteps?.videoKyc);

  if (videoKycStatus !== 'PENDING') {
    this.clearPendingVideoKycRefresh();
  }
}



showSanctionModal: boolean = false;
sanctionUrl: string = '';
sanctionUrlSafe!: SafeResourceUrl;

otpData: any = null;
enteredOtp = '';

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
  const normalizedOtp = this.normalizeOtp(otp);

  if (!normalizedOtp) {
    this.toastr.error('Please enter OTP');
    return;
  }

  if (!/^\d+$/.test(normalizedOtp)) {
    this.toastr.error('OtpCode must be numeric digits only.');
    return;
  }

  const payload = {
    applicationId: this.applicationId,
    otpCode: normalizedOtp
  };

  this.spinner.show();

  this.contentService.acceptSanction(payload).subscribe({
    next: (res: any) => {
      this.spinner.hide();

      if (res?.success) {

        this.showSanctionModal = false;
        this.enteredOtp = '';

        // 🔥 refresh tracker
        this.applicationStatusApi();

      }
    },
    error: (err) => {
      this.spinner.hide();
      this.toastr.error(getFirstApiErrorMessage(err, 'Failed to accept sanction'));
    }
  });
}

onSanctionOtpInput(value: string) {
  this.enteredOtp = this.normalizeOtp(value);
}

allowOnlyOtpDigits(event: KeyboardEvent) {
  const allowedControlKeys = [
    'Backspace',
    'Delete',
    'Tab',
    'ArrowLeft',
    'ArrowRight',
    'Home',
    'End'
  ];

  if (allowedControlKeys.includes(event.key)) {
    return;
  }

  if (!/^\d$/.test(event.key)) {
    event.preventDefault();
  }
}

handleSanctionOtpPaste(event: ClipboardEvent) {
  const pastedValue = event.clipboardData?.getData('text') || '';
  const normalizedOtp = this.normalizeOtp(pastedValue);

  event.preventDefault();
  this.enteredOtp = normalizedOtp;
}

private normalizeOtp(value: string): string {
  return String(value || '').replace(/\D/g, '').trim();
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
      this.persistPendingEnachMandateRowId(this.mandateRowId);

      if (url) {
        this.enachUrl = url;
        this.openEnachInNewTab();

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
  this.restorePendingEnachMandateRowId();

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
    const enachWindow = window.open(this.enachUrl, '_blank', 'noopener');

    if (!enachWindow) {
      this.toastr.error('Please allow popups to continue eNACH');
      return;
    }

    this.toastr.info('eNACH opened in a new tab. Complete it there and return here.');
    this.monitorEnachWindow(enachWindow);
  }
}

private monitorEnachWindow(enachWindow: Window) {
  this.clearEnachWindowPollTimer();

  this.enachWindowPollTimer = setInterval(() => {
    if (!enachWindow.closed) return;

    this.clearEnachWindowPollTimer();

    if (this.mandateRowId) {
      this.verifyEnach();
    }
  }, 1500);
}

private clearEnachWindowPollTimer() {
  if (this.enachWindowPollTimer) {
    clearInterval(this.enachWindowPollTimer);
    this.enachWindowPollTimer = null;
  }
}

private tryAutoRefreshEnachStatus(): boolean {
  if (this.hasAutoTriggeredEnachRefresh || !this.mandateRowId) {
    return false;
  }

  this.hasAutoTriggeredEnachRefresh = true;
  this.verifyEnach();
  return true;
}

private persistPendingEnachMandateRowId(mandateRowId: string) {
  if (!this.canUseSessionStorage()) return;

  if (mandateRowId) {
    sessionStorage.setItem(this.enachMandateStorageKey, mandateRowId);
    return;
  }

  sessionStorage.removeItem(this.enachMandateStorageKey);
}

private restorePendingEnachMandateRowId() {
  if (this.mandateRowId || !this.canUseSessionStorage()) return;

  this.mandateRowId =
    sessionStorage.getItem(this.enachMandateStorageKey)?.trim() || '';
}

private clearPendingEnachMandateIfCompleted(steps: any) {
  if (this.normalizeTrackerStatus(steps?.enach) !== 'DONE') return;

  this.mandateRowId = '';
  this.persistPendingEnachMandateRowId('');
}

private canUseSessionStorage(): boolean {
  return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
}

isLoanCompleted: boolean = false;

setDashboardFlags(data: any) {

  this.isLoanCompleted =
    this.loanProgress === 100 &&
    data?.loanTracking?.showActiveLoanCard === true;

}


refreshStatus() {
  window.location.reload();
}

openRepayment(): void {
  if (!this.applicationId) {
    this.toastr.error('Application not found');
    return;
  }

  this.router.navigate(['/dashboard/profile/loan-repay', this.applicationId]);
}



}



