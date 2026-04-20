
import { Component, OnDestroy, OnInit } from '@angular/core';
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
  private readonly enachReturnRefreshStorageKey = 'dashboard.enachReturnRefreshPending';
  private readonly repaymentRefreshPollDelayMs = 1000;
  private readonly repaymentRefreshSafetyTimeoutMs = 30000;
  private readonly reloanTokenRefreshDelayMs = 1000;
  private readonly reloanTokenRefreshTimeoutMs = 15000;
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
  isRepaymentRefreshInProgress = false;
  isReloanActionBusy = false;
  private dashboardRefreshTimeouts: ReturnType<typeof setTimeout>[] = [];
  private reloanRefreshTimeouts: ReturnType<typeof setTimeout>[] = [];
  private queryParamSubscription: Subscription | null = null;
  private wasDocumentHidden = false;
  private shouldDeferInitialSnapshotRefresh = false;
  private isRepaymentRefreshContext = false;
  private repaymentRefreshStartedAt = 0;
  private reloanTokenRefreshStartedAt = 0;
  private readonly visibilityChangeHandler = () => this.handleDocumentVisibilityChange();
  private readonly windowFocusHandler = () => this.handleWindowFocus();
  private lastTabReturnRefreshAt = 0;
  private readonly tabReturnRefreshCooldownMs = 1000;
  private isApplicationStatusInFlight = false;
  private shouldRefreshEnachOnReturn = false;
  private isEnachRefreshInFlight = false;
  private isVideoKycRefreshInFlight = false;

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
  reloanDecision: any = null;
  applicationId: string = '';

  get showReloanActionButton(): boolean {
    const reloanDecisionState = this.getReloanDecisionState();

    if (reloanDecisionState !== 'none') {
      return reloanDecisionState === 'eligible';
    }

    return (
      this.loanTracking?.showReloanCard === true &&
      this.canApplyReloan
    );
  }

  get showClosedLoanUnavailableCard(): boolean {
    if (this.profileProgress !== 100 || !this.hasClosedLoanOrPendingClosureSync()) {
      return false;
    }

    const reloanDecisionState = this.getReloanDecisionState();

    if (reloanDecisionState !== 'none') {
      return reloanDecisionState === 'pending' || reloanDecisionState === 'not_eligible';
    }

    return this.hasExplicitReloanUnavailableFlag();
  }

  get canApplyReloan(): boolean {
    return !!this.getResolvedReloanActionParams();
  }

  get isPendingReloanDecision(): boolean {
    return this.getReloanDecisionState() === 'pending';
  }

  get isRejectedReloanDecision(): boolean {
    return this.getReloanDecisionState() === 'not_eligible';
  }

  get reloanUnavailableTitle(): string {
    return this.isPendingReloanDecision
      ? 'Loan Closed Successfully'
      : 'Re-Loan Unavailable';
  }

  get showReloanUnavailableReason(): boolean {
    return this.isRejectedReloanDecision && !!this.ineligibleReason;
  }

  get showReloanUnavailableRetryDate(): boolean {
    return this.isRejectedReloanDecision && !!this.retryDate;
  }

  get closedLoanSummary(): any | null {
    if (!this.hasClosedLoanOrPendingClosureSync()) {
      return null;
    }

    const tracking = this.loanTracking || {};
    const activeLoan = tracking?.activeLoan || {};
    const repayment = tracking?.repayment || {};
    const request = this.currentLoanRequest || {};

    const loanAmount = this.pickFirstAmount(
      activeLoan?.approvedAmount,
      tracking?.approvedAmount,
      activeLoan?.principal,
      request?.approvedAmount,
      request?.requestedAmount,
      request?.loanAmount,
      request?.principal
    );
    const disbursedAmount = this.pickFirstAmount(
      activeLoan?.netDisbursalAmount,
      tracking?.netDisbursalAmount,
      activeLoan?.disbursalAmount,
      tracking?.disbursalAmount,
      request?.netDisbursalAmount,
      request?.disbursalAmount
    );
    const totalPaidAmount = this.pickFirstAmount(
      repayment?.totalPaidAmount,
      repayment?.paidAmount,
      repayment?.repaidAmount,
      repayment?.totalRepaymentAmount,
      tracking?.totalPaidAmount,
      tracking?.paidAmount,
      tracking?.repaidAmount,
      activeLoan?.totalPaidAmount,
      activeLoan?.paidAmount,
      activeLoan?.repayAmount,
      tracking?.repayAmount,
      request?.totalPaidAmount,
      request?.paidAmount,
      request?.totalRepaymentAmount,
      request?.repayAmount
    );
    const explicitInterestPaidAmount = this.pickFirstAmount(
      repayment?.interestPaid,
      repayment?.totalInterestPaid,
      repayment?.interestAmount,
      repayment?.interestAccrued,
      tracking?.interestPaid,
      tracking?.totalInterestPaid,
      tracking?.interestAmount,
      tracking?.totalInterest,
      activeLoan?.interestPaid,
      activeLoan?.totalInterestPaid,
      activeLoan?.interestAmount,
      activeLoan?.totalInterest,
      request?.interestPaid,
      request?.totalInterestPaid,
      request?.interestAmount,
      request?.totalInterest
    );
    const interestBaseAmount =
      disbursedAmount !== null
        ? disbursedAmount
        : loanAmount;
    const interestPaidAmount =
      explicitInterestPaidAmount !== null
        ? explicitInterestPaidAmount
        : totalPaidAmount !== null && interestBaseAmount !== null
          ? Math.max(totalPaidAmount - interestBaseAmount, 0)
          : null;

    return {
      loanNumber: this.pickFirstString(
        tracking?.applicationNumber,
        tracking?.loanAccountNo,
        tracking?.loanId,
        activeLoan?.loanNumber,
        activeLoan?.loanAccountNo,
        request?.applicationNumber,
        request?.loanAccountNo,
        this.applicationId
      ),
      statusLabel:
        this.pickFirstString(
          tracking?.loanStatus,
          activeLoan?.status,
          activeLoan?.loanStatus,
          request?.loanStatus,
          request?.status,
          repayment?.loanStatus
        ) || 'Closed',
      loanAmount,
      disbursedAmount,
      totalPaidAmount,
      interestPaidAmount,
      closedDateDisplay: this.formatSnapshotDateForDisplay(
        tracking?.closedAt,
        tracking?.closedOn,
        tracking?.closedDate,
        activeLoan?.closedAt,
        activeLoan?.closedOn,
        activeLoan?.closedDate,
        request?.closedAt,
        request?.closedOn,
        request?.closedDate,
        repayment?.closedAt,
        repayment?.closedOn,
        repayment?.paidAt,
        repayment?.repaidAt,
        tracking?.repaidAt,
        tracking?.repayDate,
        activeLoan?.repayDate,
        activeLoan?.maturityDate,
        request?.repayDate,
        request?.maturityDate
      )
    };
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
    this.restorePendingEnachReturnRefresh();
    this.listenForDashboardRefreshRequests();
    if (!this.shouldDeferInitialSnapshotRefresh) {
      this.getBorrowerSnapshot();
    }
    this.registerTabChangeRefresh();
  }

  ngOnDestroy(): void {
    this.clearDashboardRefreshTimeouts();
    this.clearReloanRefreshTimeouts();
    this.isRepaymentRefreshInProgress = false;
    this.isReloanActionBusy = false;
    this.queryParamSubscription?.unsubscribe();
    this.unregisterTabChangeRefresh();
  }

  showActiveLoanCard: boolean = false;
  activeLoan: any = null;

getBorrowerSnapshot() {
  this.getBorrowerSnapshotWithOptions(true);
}

private getBorrowerSnapshotWithOptions(showLoader = true, onComplete?: () => void) {
  if (showLoader) {
    this.spinner.show();
  }

  this.contentService.getBorrowerSnapshot().subscribe({
    next: (res: any) => {
      if (showLoader) {
        this.spinner.hide();
      }

      if (!res?.success) {
        onComplete?.();
        return;
      }

      const data = res?.data || {};
      this.applyBorrowerSnapshotData(data, showLoader, onComplete);
    },
    error: () => {
      if (showLoader) {
        this.spinner.hide();
      }
      onComplete?.();
    }
  });
}

private applyBorrowerSnapshotData(data: any, showLoader = true, onComplete?: () => void) {
  const offer = data?.offer || {};
  const eligibility = data?.eligibility || {};

  this.applicationId = data?.application?.id || '';
  this.profileProgress = data?.basicFlow?.percent || 0;
  this.loanProgress = data?.applicationFlow?.percent || 0;
  this.overallProgress = data?.progressPercent || 0;
  this.loanTracking = data?.loanTracking || null;
  this.reloanDecision = this.extractReloanDecision(data);
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
  this.patchActiveLoanFromSnapshot();
  this.clearPendingEnachMandateIfCompleted(this.trackingSteps);

  this.showLoanCard =
    !this.showActiveLoanCard &&
    this.isEligible &&
    this.profileProgress === 100 &&
    this.loanProgress < 100;

  if (this.showTracker) {
    this.applicationStatusApi(showLoader, onComplete);
    return;
  }

  onComplete?.();
}

private listenForDashboardRefreshRequests() {
  this.queryParamSubscription = this.route.queryParamMap.subscribe((params) => {
    if (params.get('refresh') !== 'true') {
      return;
    }

    this.shouldDeferInitialSnapshotRefresh = true;
    this.isRepaymentRefreshContext = true;

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
  this.repaymentRefreshStartedAt = Date.now();
  this.isRepaymentRefreshInProgress = true;
  this.spinner.show();
  this.runDashboardRefreshAttempt();
}

private runDashboardRefreshAttempt(delayMs = 0) {
  const timeout = setTimeout(() => {
    this.getBorrowerSnapshotWithOptions(false, () => {
      if (this.hasReachedRepaymentRefreshTarget() || this.hasExceededRepaymentRefreshSafetyTimeout()) {
        this.finishDashboardRefresh();
        return;
      }

      this.runDashboardRefreshAttempt(this.repaymentRefreshPollDelayMs);
    });
  }, delayMs);

  this.dashboardRefreshTimeouts.push(timeout);
}

private clearDashboardRefreshTimeouts() {
  this.dashboardRefreshTimeouts.forEach((timeout) => clearTimeout(timeout));
  this.dashboardRefreshTimeouts = [];
}

private finishDashboardRefresh() {
  this.clearDashboardRefreshTimeouts();
  this.repaymentRefreshStartedAt = 0;
  this.isRepaymentRefreshInProgress = false;
  this.dashboardRefreshService.requestRefresh();
  this.spinner.hide();
}

private hasExceededRepaymentRefreshSafetyTimeout(): boolean {
  return this.repaymentRefreshStartedAt > 0 &&
    Date.now() - this.repaymentRefreshStartedAt >= this.repaymentRefreshSafetyTimeoutMs;
}

private registerTabChangeRefresh() {
  if (typeof document === 'undefined') return;

  this.wasDocumentHidden = document.hidden;
  document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', this.windowFocusHandler);
  }
}

private unregisterTabChangeRefresh() {
  if (typeof document === 'undefined') return;

  document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
  if (typeof window !== 'undefined') {
    window.removeEventListener('focus', this.windowFocusHandler);
  }
}

private handleDocumentVisibilityChange() {
  if (typeof document === 'undefined') return;

  if (document.hidden) {
    this.wasDocumentHidden = true;
    return;
  }

  if (!this.wasDocumentHidden) return;

  this.wasDocumentHidden = false;
  this.refreshStatusOnTabReturn();
}

private handleWindowFocus() {
  if (typeof document !== 'undefined' && document.hidden) {
    return;
  }

  this.refreshStatusOnTabReturn();
}

private refreshStatusOnTabReturn() {
  const now = Date.now();

  if (now - this.lastTabReturnRefreshAt < this.tabReturnRefreshCooldownMs) {
    return;
  }

  this.lastTabReturnRefreshAt = now;
  if (this.tryRefreshEnachOnReturn()) {
    return;
  }

  this.refreshStatus();
}

private tryRefreshEnachOnReturn(refreshApplicationStatusAfterSuccess = true): boolean {
  this.restorePendingEnachMandateRowId();
  this.restorePendingEnachReturnRefresh();

  if (!this.mandateRowId) {
    return false;
  }

  this.verifyEnach(refreshApplicationStatusAfterSuccess);
  return true;
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

private syncTrackerRuntimeState(statusData: any) {
  if (!statusData || typeof statusData !== 'object') return;

  const existingTracking = this.loanTracking || {};
  const incomingTracking = statusData?.loanTracking || {};
  const incomingVideoKyc = statusData?.videoKyc || incomingTracking?.videoKyc || {};
  const incomingNextAction = statusData?.nextAction || incomingTracking?.nextAction;
  const mergedTracking = {
    ...existingTracking,
    ...incomingTracking,
    videoKyc: {
      ...(existingTracking?.videoKyc || {}),
      ...(incomingVideoKyc || {})
    },
    nextAction: this.resolveNextAction(existingTracking?.nextAction, incomingNextAction)
  };

  this.loanTracking = mergedTracking;
  this.reloanDecision =
    this.extractReloanDecision(statusData) ||
    this.extractReloanDecision({ loanTracking: mergedTracking, currentLoanRequest: this.currentLoanRequest }) ||
    this.reloanDecision;
  this.videoKycCustomerUrl =
    statusData?.videoKycCustomerUrl ||
    statusData?.journeyLinks?.videoKycCustomerUrl ||
    statusData?.journey?.links?.videoKycCustomerUrl ||
    statusData?.journey?.journeyLinks?.videoKycCustomerUrl ||
    incomingTracking?.videoKycCustomerUrl ||
    incomingTracking?.journeyLinks?.videoKycCustomerUrl ||
    incomingTracking?.journey?.links?.videoKycCustomerUrl ||
    incomingTracking?.journey?.journeyLinks?.videoKycCustomerUrl ||
    incomingNextAction?.url ||
    incomingVideoKyc?.customerUrl ||
    incomingVideoKyc?.url ||
    this.videoKycCustomerUrl ||
    '';
}

private patchActiveLoanFromSnapshot() {
  const tracking = this.loanTracking || {};
  const activeLoan = tracking?.activeLoan || {};
  const repayment = tracking?.repayment || {};
  const isDisbursementDone = this.isDisbursementCompleted();
  const shouldSuppressActiveLoanCard = this.isPendingLoanClosureSync(tracking);

  this.showActiveLoanCard =
    tracking?.showActiveLoanCard === true &&
    isDisbursementDone &&
    !shouldSuppressActiveLoanCard;

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

private hasClosedLoanOrPendingClosureSync(): boolean {
  return this.hasClosedLoan() || this.isPendingLoanClosureSync();
}

private isPendingLoanClosureSync(trackingSource?: any): boolean {
  const tracking = trackingSource || this.loanTracking || {};

  if (!this.isRepaymentRefreshContext || tracking?.showActiveLoanCard !== true) {
    return false;
  }

  return this.hasClearedLoanBalance(tracking);
}

private hasClearedLoanBalance(trackingSource?: any): boolean {
  const tracking = trackingSource || this.loanTracking || {};
  const repayment = tracking?.repayment || {};
  const activeLoan = tracking?.activeLoan || {};
  const dueAmounts = [
    repayment?.outstandingAmount,
    tracking?.outstandingAmount,
    activeLoan?.outstandingAmount,
    repayment?.principalOutstanding,
    tracking?.principalOutstanding,
    repayment?.nextDueAmount,
    tracking?.nextDueAmount,
    activeLoan?.nextDueAmount,
    repayment?.minimumDueAmount,
    tracking?.minimumDueAmount,
    repayment?.payableAmount,
    tracking?.payableAmount
  ]
    .map((amount) => this.pickFirstAmount(amount))
    .filter((amount): amount is number => amount !== null);

  return dueAmounts.length > 0 && dueAmounts.every((amount) => amount <= 0);
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

private getReloanDecisionState(): 'pending' | 'not_eligible' | 'eligible' | 'none' {
  const hasPendingClosureSync = this.isPendingLoanClosureSync();

  if (!this.hasClosedLoan() && !hasPendingClosureSync) {
    return 'none';
  }

  const reloanDecision = this.reloanDecision;

  if (!reloanDecision || typeof reloanDecision !== 'object') {
    return hasPendingClosureSync ? 'pending' : 'none';
  }

  if (!this.isReloanDecisionSaved(reloanDecision)) {
    return 'pending';
  }

  return reloanDecision?.eligible === true ? 'eligible' : 'not_eligible';
}

private isReloanDecisionSaved(reloanDecision: any): boolean {
  return reloanDecision?.saved === true || reloanDecision?.isSaved === true;
}

private extractReloanDecision(source: any): any {
  const reloanDecision =
    source?.reloanDecision ||
    source?.loanTracking?.reloanDecision ||
    source?.currentLoanRequest?.reloanDecision ||
    null;

  return reloanDecision && typeof reloanDecision === 'object'
    ? reloanDecision
    : null;
}

private resolveNextAction(existingNextAction: any, incomingNextAction: any): any {
  if (!incomingNextAction) {
    return existingNextAction;
  }

  if (!existingNextAction) {
    return incomingNextAction;
  }

  const existingReloanParams = this.getResolvedReloanActionParams(existingNextAction);
  const incomingReloanParams = this.getResolvedReloanActionParams(incomingNextAction);

  if (existingReloanParams && !incomingReloanParams) {
    return existingNextAction;
  }

  return incomingNextAction;
}

private getResolvedReloanActionParams(nextActionSource?: any): { applicationId: string; token: string } | null {
  const actionUrl = this.getNextActionUrl(nextActionSource);

  if (!actionUrl) {
    return null;
  }

  const parsedUrl = this.parseActionUrl(actionUrl);
  if (!parsedUrl) {
    return null;
  }

  const token = parsedUrl.searchParams.get('token')?.trim() || '';
  const applicationId =
    parsedUrl.searchParams.get('applicationId')?.trim() ||
    this.applicationId ||
    '';

  if (!token || !applicationId) {
    return null;
  }

  return {
    applicationId,
    token
  };
}

private getNextActionUrl(nextActionSource?: any): string {
  const nextAction = nextActionSource ?? this.loanTracking?.nextAction;
  const url = nextAction?.url;

  return typeof url === 'string' ? url.trim() : '';
}

private parseActionUrl(url: string): URL | null {
  if (!url) {
    return null;
  }

  const baseOrigin =
    typeof window !== 'undefined' && typeof window.location?.origin === 'string'
      ? window.location.origin
      : 'http://localhost';

  try {
    return new URL(url, baseOrigin);
  } catch {
    return null;
  }
}

private pickFirstAmount(...candidates: any[]): number | null {
  for (const candidate of candidates) {
    const numericValue = Number(candidate);

    if (Number.isFinite(numericValue) && numericValue >= 0) {
      return numericValue;
    }
  }

  return null;
}

private pickFirstString(...candidates: any[]): string {
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') {
      continue;
    }

    const trimmedValue = candidate.trim();
    if (trimmedValue) {
      return trimmedValue;
    }
  }

  return '';
}

private formatSnapshotDateForDisplay(...candidates: any[]): string {
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') {
      continue;
    }

    const formattedDate = formatDateForDisplay(candidate);
    if (formattedDate) {
      return formattedDate;
    }

    const trimmedValue = candidate.trim();
    if (trimmedValue) {
      return trimmedValue;
    }
  }

  return '';
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
    const reloanActionParams = this.getResolvedReloanActionParams();

    if (!reloanActionParams) {
      this.toastr.info('We are refreshing your reloan link. Please wait a moment.');
      this.refreshReloanActionAndRetry();
      return;
    }

    // 🔥 TOKEN EXTRACT
    this.consumeReloan(reloanActionParams.applicationId, reloanActionParams.token);
  }

  // ================= CONSUME API =================
  consumeReloan(applicationId: string, token: string, allowRefreshRetry = true) {
    this.isReloanActionBusy = true;
    this.spinner.show();

    const payload = {
      applicationId,
      reloanToken: token
    };

    this.contentService.reloanConsume(payload).subscribe({
      next: (res: any) => {
        if (res?.success) {
          this.finishReloanRefreshFlow();
          this.toastr.success('Reloan started 🚀');

          // 🔥 REFRESH SNAPSHOT
          this.getBorrowerSnapshot();
          return;
        }

        const errorMessage = getFirstApiErrorMessage(res);
        if (allowRefreshRetry && this.shouldRetryReloanToken(errorMessage)) {
          this.refreshReloanActionAndRetry(token);
          return;
        }

        this.finishReloanRefreshFlow();
        if (errorMessage) {
          this.toastr.error(errorMessage);
        }
      },
      error: (err) => {
        const errorMessage = getFirstApiErrorMessage(err);
        if (allowRefreshRetry && this.shouldRetryReloanToken(errorMessage)) {
          this.refreshReloanActionAndRetry(token);
          return;
        }

        this.finishReloanRefreshFlow();
        if (errorMessage) {
          this.toastr.error(errorMessage);
        }
      }
    });
  }

  private refreshReloanActionAndRetry(previousToken = '') {
    this.clearReloanRefreshTimeouts();
    this.reloanTokenRefreshStartedAt = Date.now();
    this.isReloanActionBusy = true;
    this.spinner.show();
    this.runReloanRefreshAttempt(previousToken);
  }

  private runReloanRefreshAttempt(previousToken: string, delayMs = 0) {
    const timeout = setTimeout(() => {
      this.getBorrowerSnapshotWithOptions(false, () => {
        const refreshedReloanActionParams = this.getResolvedReloanActionParams();
        const hasFreshToken = !!(
          refreshedReloanActionParams &&
          refreshedReloanActionParams.token &&
          refreshedReloanActionParams.token !== previousToken
        );
        const canConsumeCurrentToken = !!(refreshedReloanActionParams && !previousToken);

        if (hasFreshToken || canConsumeCurrentToken) {
          this.clearReloanRefreshTimeouts();
          this.consumeReloan(
            refreshedReloanActionParams!.applicationId,
            refreshedReloanActionParams!.token,
            false
          );
          return;
        }

        if (this.hasExceededReloanRefreshTimeout()) {
          this.finishReloanRefreshFlow();
          this.toastr.error('We could not refresh your reloan link yet. Please try again in a moment.');
          return;
        }

        this.runReloanRefreshAttempt(previousToken, this.reloanTokenRefreshDelayMs);
      });
    }, delayMs);

    this.reloanRefreshTimeouts.push(timeout);
  }

  private clearReloanRefreshTimeouts() {
    this.reloanRefreshTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.reloanRefreshTimeouts = [];
  }

  private finishReloanRefreshFlow() {
    this.clearReloanRefreshTimeouts();
    this.reloanTokenRefreshStartedAt = 0;
    this.isReloanActionBusy = false;
    this.spinner.hide();
  }

  private hasExceededReloanRefreshTimeout(): boolean {
    return this.reloanTokenRefreshStartedAt > 0 &&
      Date.now() - this.reloanTokenRefreshStartedAt >= this.reloanTokenRefreshTimeoutMs;
  }

  private shouldRetryReloanToken(errorMessage: string): boolean {
    const normalizedMessage = (errorMessage || '').trim().toLowerCase();

    return normalizedMessage.includes('invalid reloan token') ||
      normalizedMessage.includes('invalid reloantoken') ||
      normalizedMessage.includes('reloan token');
  }

  // ================= HELPERS =================
  getQueryParam(url: string, key: string): string | null {
    const parsedUrl = this.parseActionUrl(url);
    return parsedUrl?.searchParams.get(key) || null;
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

applicationStatusApi(showLoader = true, onComplete?: () => void) {
  if (!this.applicationId || this.isApplicationStatusInFlight) {
    onComplete?.();
    return;
  }

  if (showLoader) {
    this.spinner.show();
  }
  this.isApplicationStatusInFlight = true;

  this.contentService.applicationStatus(this.applicationId).subscribe({
    next: (res: any) => {
      if (showLoader) {
        this.spinner.hide();
      }
      this.isApplicationStatusInFlight = false;

      if (!res?.success) {
        onComplete?.();
        return;
      }

      const data = res?.data || {};
      this.applyApplicationStatusData(data);
      onComplete?.();
    },
    error: () => {
      if (showLoader) {
        this.spinner.hide();
      }
      this.isApplicationStatusInFlight = false;
      console.error('Application status failed');
      onComplete?.();
    }
  });
}

private applyApplicationStatusData(data: any) {
  this.syncTrackerRuntimeState(data);
  this.updateTrackerFlow(data?.statusFlow || this.loanTracking?.statusFlow);
  this.trackingSteps = this.buildTrackerSteps(data?.steps || this.trackingSteps || {});
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
}

private hasReachedRepaymentRefreshTarget(): boolean {
  if (this.showClosedLoanUnavailableCard) {
    return true;
  }

  if (this.getReloanDecisionState() === 'eligible') {
    return this.canApplyReloan;
  }

  return this.hasClosedLoanOrPendingClosureSync() &&
    !this.showActiveLoanCard &&
    this.getReloanDecisionState() !== 'none';
}
async startVideoKyc() {
  if (!this.videoKycCustomerUrl) {
    this.toastr.error('KYC URL not found');
    return;
  }

  this.spinner.show();
  const videoKycWindow = this.openVideoKycInNewTab();
  if (!videoKycWindow) {
    this.spinner.hide();
    return;
  }

  try {
    const allowed = await this.ensureLocationAccess();
    if (!allowed) {
      this.closeVideoKycWindow(videoKycWindow);
      return;
    }
  } finally {
    this.spinner.hide();
  }
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
    this.toastr.info('Complete Video KYC in the new tab, then come back and click Refresh Status.');
  } else {
    this.toastr.error('Please allow popups to continue Video KYC');
  }

  return videoKycWindow;
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


verifyEnach(refreshApplicationStatusAfterSuccess = true) {
  this.restorePendingEnachMandateRowId();

  if (this.isEnachRefreshInFlight) {
    return;
  }

  if (!this.mandateRowId) {
    console.error('Mandate ID missing');
    return;
  }

  const payload = {
    mandateRowId: this.mandateRowId
  };

  this.spinner.show();
  this.isEnachRefreshInFlight = true;

  this.contentService.mendateRefresh(payload).subscribe({
    next: (res: any) => {
      this.spinner.hide();
      this.isEnachRefreshInFlight = false;

      if (!res?.success) return;

      this.shouldRefreshEnachOnReturn = true;
      this.persistPendingEnachReturnRefresh(true);

      if (refreshApplicationStatusAfterSuccess) {
        this.applicationStatusApi();
      }

    },
    error: () => {
      this.spinner.hide();
      this.isEnachRefreshInFlight = false;
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

    this.shouldRefreshEnachOnReturn = true;
    this.persistPendingEnachReturnRefresh(true);
    this.toastr.info('eNACH opened in a new tab. Complete it there, then return to this app.');
  }
}

private persistPendingEnachMandateRowId(mandateRowId: string) {
  if (!this.canUseSessionStorage()) return;

  if (mandateRowId) {
    sessionStorage.setItem(this.enachMandateStorageKey, mandateRowId);
    return;
  }

  sessionStorage.removeItem(this.enachMandateStorageKey);
}

private persistPendingEnachReturnRefresh(shouldRefresh: boolean) {
  if (!this.canUseSessionStorage()) return;

  if (shouldRefresh) {
    sessionStorage.setItem(this.enachReturnRefreshStorageKey, 'true');
    return;
  }

  sessionStorage.removeItem(this.enachReturnRefreshStorageKey);
}

private restorePendingEnachMandateRowId() {
  if (this.mandateRowId || !this.canUseSessionStorage()) return;

  this.mandateRowId =
    sessionStorage.getItem(this.enachMandateStorageKey)?.trim() || '';
}

private restorePendingEnachReturnRefresh() {
  if (!this.canUseSessionStorage()) return;

  this.shouldRefreshEnachOnReturn =
    sessionStorage.getItem(this.enachReturnRefreshStorageKey) === 'true';
}

private clearPendingEnachMandateIfCompleted(steps: any) {
  if (this.normalizeTrackerStatus(steps?.enach) !== 'DONE') return;

  this.mandateRowId = '';
  this.shouldRefreshEnachOnReturn = false;
  this.persistPendingEnachMandateRowId('');
  this.persistPendingEnachReturnRefresh(false);
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
  if (this.applicationId) {
    this.applicationStatusApi();
    return;
  }

  this.getBorrowerSnapshot();
}

openRepayment(): void {
  if (!this.applicationId) {
    this.toastr.error('Application not found');
    return;
  }

  this.router.navigate(['/dashboard/profile/loan-repay', this.applicationId]);
}



}



