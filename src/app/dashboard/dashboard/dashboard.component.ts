
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ContentService } from '../../../service/content.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
import { getFirstApiErrorMessage } from '../../../service/api-error.util';
import { formatDateForDisplay } from '../../shared/date-format.util';
import { firstValueFrom, Subscription } from 'rxjs';
import { DashboardRefreshService } from '../dashboard-refresh.service';

type RefreshableTrackerStep = 'sanction' | 'esign' | 'enach';

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
  private readonly repaymentRefreshSafetyTimeoutMs = 60000;
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
  private readonly refreshableTrackerSteps: RefreshableTrackerStep[] = [
    // Video KYC should stay read-only on the dashboard refresh flow.
    'sanction',
    'esign',
    'enach'
  ];

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
  private isRefreshStatusInFlight = false;
  private hasTriggeredReloanSnapshotRefresh = false;

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

  borrowerSnapshot: any = null;
  loanTracking: any;
  reloanDecision: any = null;
  applicationId: string = '';
  dashboardVersion: number | null = null;
  dashboardPrimaryCardType: string | null = null;
  dashboardPrimaryCard: any = null;

  get showBasicProfileCard(): boolean {
    return this.isPrimaryCardType('BASIC_PROFILE_COMPLETION');
  }

  get showNegativeStatusCard(): boolean {
    return this.matchesPrimaryCardTypeOrStatus(
      'NOT_ELIGIBLE',
      'RESTRICTED',
      'APPLICATION_REJECTED',
      'SYSTEM_REJECTED'
    );
  }

  get showNotEligibleSimpleCard(): boolean {
    return this.isPrimaryCardType('RELOAN_NOT_ELIGIBLE') ||
      this.matchesPrimaryCardTypeOrStatus('NOT_ELIGIBLE', 'APPLICATION_REJECTED');
  }

  get showDecisionNegativeCard(): boolean {
    return this.showNegativeStatusCard && !this.showNotEligibleSimpleCard;
  }

  get isApplicationRejectedSimpleCard(): boolean {
    return this.matchesPrimaryCardTypeOrStatus('APPLICATION_REJECTED');
  }

  get showReloanActionButton(): boolean {
    return this.isPrimaryCardType('RELOAN_ELIGIBLE');
  }

  get showClosedLoanUnavailableCard(): boolean {
    return this.isPrimaryCardType('CLOSED_LOAN');
  }

  get canApplyReloan(): boolean {
    if (!this.showReloanActionButton) {
      return false;
    }

    return !!this.getPrimaryCardCtaUrl() || !!this.getResolvedReloanActionParams();
  }

  get isPendingReloanDecision(): boolean {
    return this.isPrimaryCardType('CLOSED_LOAN');
  }

  get isRejectedReloanDecision(): boolean {
    return this.isPrimaryCardType('RELOAN_NOT_ELIGIBLE');
  }

  get reloanUnavailableTitle(): string {
    return this.dashboardPrimaryCard?.title ||
      (this.isRejectedReloanDecision ? 'Reloan Not Eligible' : 'Loan Closed');
  }

  get showReloanUnavailableReason(): boolean {
    return this.isRejectedReloanDecision && !!this.closedLoanReasonText;
  }

  get showReloanUnavailableRetryDate(): boolean {
    return this.isRejectedReloanDecision && !!this.closedLoanRetryDate;
  }

  get basicProfileCardTitle(): string {
    return this.dashboardPrimaryCard?.title || 'My Profile';
  }

  get basicProfileCardMessage(): string {
    return this.dashboardPrimaryCard?.message ||
      'Complete registration to apply for a loan. Your financial solution awaits.';
  }

  get basicProfileCardButtonLabel(): string {
    return this.dashboardPrimaryCard?.cta?.label || `Let's Start`;
  }

  get negativeCardTitle(): string {
    return this.dashboardPrimaryCard?.title ||
      (
        this.matchesPrimaryCardTypeOrStatus('SYSTEM_REJECTED')
          ? 'System Rejected'
          : this.matchesPrimaryCardTypeOrStatus('APPLICATION_REJECTED')
            ? 'Application Rejected'
            : this.matchesPrimaryCardTypeOrStatus('RESTRICTED')
              ? 'Account Restricted'
              : 'Not Eligible Right Now'
      );
  }

  get negativeCardMessage(): string {
    return this.dashboardPrimaryCard?.message ||
      (
        this.matchesPrimaryCardTypeOrStatus('SYSTEM_REJECTED')
          ? 'Your request was declined during automated system validation checks.'
          : this.matchesPrimaryCardTypeOrStatus('APPLICATION_REJECTED')
            ? 'Your current loan application could not be approved.'
            : this.matchesPrimaryCardTypeOrStatus('RESTRICTED')
              ? 'Your account currently has restrictions on borrower actions.'
            : `You don't meet the loan criteria at this moment. Review your details and try again later.`
      );
  }

  get simpleNegativeMessage(): string {
    const message = this.negativeCardMessage;

    if (!this.isApplicationRejectedSimpleCard) {
      return message;
    }

    const normalizedMessage = this.normalizeCardKey(message);
    const titleKey = this.normalizeCardKey(this.negativeCardTitle);
    const reasonKey = this.normalizeCardKey(this.negativeCardReason);

    if (
      !normalizedMessage ||
      normalizedMessage === 'REJECT' ||
      normalizedMessage === 'REJECTED' ||
      normalizedMessage === 'APPLICATION_REJECTED' ||
      normalizedMessage === titleKey ||
      normalizedMessage === reasonKey
    ) {
      return '';
    }

    return message;
  }

  get negativeCardStatusLabel(): string {
    return this.pickFirstString(
      this.dashboardPrimaryCard?.title,
      this.formatStatusLabel(this.dashboardPrimaryCard?.statusCode),
      this.formatStatusLabel(this.dashboardPrimaryCardType),
      'Not Eligible'
    );
  }

  get notEligibleBadgeText(): string {
    if (this.matchesPrimaryCardTypeOrStatus('APPLICATION_REJECTED')) {
      return this.pickFirstString(
        this.formatStatusLabel(this.dashboardPrimaryCard?.statusCode),
        this.formatStatusLabel(this.dashboardPrimaryCardType),
        'Application Rejected'
      );
    }

    return this.pickFirstString(
      this.formatStatusLabel(this.dashboardPrimaryCard?.statusCode),
      'Not Eligible'
    );
  }

  get simpleNegativeTipText(): string {
    if (this.matchesPrimaryCardTypeOrStatus('APPLICATION_REJECTED')) {
      return 'Tip: review the rejection reason carefully before applying again.';
    }

    return 'Tip: update income/KYC to improve your chances.';
  }

  get negativeCardThemeClass(): string {
    if (this.matchesPrimaryCardTypeOrStatus('SYSTEM_REJECTED')) {
      return 'not-eligible-card--system';
    }

    if (this.matchesPrimaryCardTypeOrStatus('APPLICATION_REJECTED')) {
      return 'not-eligible-card--application';
    }

    if (this.matchesPrimaryCardTypeOrStatus('RESTRICTED')) {
      return 'not-eligible-card--restricted';
    }

    return 'not-eligible-card--eligibility';
  }

  get negativeCardKicker(): string {
    if (this.matchesPrimaryCardTypeOrStatus('SYSTEM_REJECTED')) {
      return 'System Decision';
    }

    if (this.matchesPrimaryCardTypeOrStatus('APPLICATION_REJECTED')) {
      return 'Application Decision';
    }

    if (this.matchesPrimaryCardTypeOrStatus('RESTRICTED')) {
      return 'Account Status';
    }

    return 'Eligibility Update';
  }

  get negativeCardIconClass(): string {
    if (this.matchesPrimaryCardTypeOrStatus('SYSTEM_REJECTED')) {
      return 'fa-shield-halved';
    }

    if (this.matchesPrimaryCardTypeOrStatus('APPLICATION_REJECTED')) {
      return 'fa-file-circle-xmark';
    }

    if (this.matchesPrimaryCardTypeOrStatus('RESTRICTED')) {
      return 'fa-lock';
    }

    return 'fa-circle-exclamation';
  }

  get negativeCardCaseType(): string {
    return this.pickFirstString(
      this.formatStatusLabel(this.dashboardPrimaryCard?.statusCode),
      this.formatStatusLabel(this.dashboardPrimaryCardType),
      'Review Required'
    );
  }

  get negativeCardReason(): string {
    const cardData = this.dashboardPrimaryCard?.data || {};

    if (this.isRejectedReloanDecision) {
      const reloanData = this.primaryCardReloanData;

      return this.pickFirstString(
        reloanData?.reason,
        reloanData?.remarks,
        reloanData?.message,
        reloanData?.customerMessage,
        reloanData?.reloanDecision?.remarks,
        reloanData?.decision?.remarks,
        reloanData?.rejection?.reason,
        reloanData?.eligibility?.ineligibleReason,
        reloanData?.ineligible?.reason,
        reloanData?.ineligible?.message
      );
    }

    if (this.isPrimaryCardType('RESTRICTED')) {
      return this.pickFirstString(
        cardData?.reason,
        cardData?.customerMessage
      );
    }

    if (this.isPrimaryCardType('NOT_ELIGIBLE')) {
      return this.pickFirstString(
        this.ineligibleReason,
        cardData?.eligibility?.ineligibleReason,
        cardData?.ineligible?.reason,
        cardData?.ineligible?.message
      );
    }

    if (this.matchesPrimaryCardTypeOrStatus('APPLICATION_REJECTED', 'SYSTEM_REJECTED')) {
      return this.pickFirstString(
        cardData?.rejection?.reason,
        this.loanTracking?.rejection?.reason,
        cardData?.reason
      );
    }

    return '';
  }

  get negativeCardRetryDate(): string {
    const cardData = this.dashboardPrimaryCard?.data || {};

    if (this.isRejectedReloanDecision) {
      const reloanData = this.primaryCardReloanData;

      return this.pickFirstString(
        reloanData?.retryAfter,
        reloanData?.retryDate,
        reloanData?.retryAllowedOn,
        reloanData?.nextEligibilityAllowedOn,
        reloanData?.nextEligibleAt,
        reloanData?.reloanDecision?.retryAllowedOn,
        reloanData?.decision?.retryAllowedOn,
        reloanData?.rejection?.retryAllowedOn,
        reloanData?.eligibility?.nextEligibilityAllowedOn,
        reloanData?.eligibility?.retryDate,
        reloanData?.ineligible?.retryAfter
      );
    }

    return this.pickFirstString(
      this.retryDate,
      cardData?.rejection?.retryAllowedOn,
      this.loanTracking?.reapplyEligibleOn,
      this.loanTracking?.rejection?.retryAllowedOn,
      cardData?.eligibility?.nextEligibilityAllowedOn,
      cardData?.eligibility?.retryDate,
      cardData?.ineligible?.retryAfter
    );
  }

  get showNegativeRetryPanel(): boolean {
    return this.matchesPrimaryCardTypeOrStatus('NOT_ELIGIBLE') && !!this.negativeCardRetryDate;
  }

  get negativeCardResolutionText(): string {
    if (this.matchesPrimaryCardTypeOrStatus('SYSTEM_REJECTED')) {
      return 'This decision came from automated validation checks. If the details look correct, contact support before retrying.';
    }

    if (this.matchesPrimaryCardTypeOrStatus('APPLICATION_REJECTED')) {
      return 'This application has reached a rejected outcome. Review the reason carefully before starting a fresh request.';
    }

    if (this.matchesPrimaryCardTypeOrStatus('RESTRICTED')) {
      return 'Your borrower profile currently has restrictions on loan actions. Support can help confirm the next allowed step.';
    }

    return 'Your current eligibility inputs do not meet the present lending criteria. Updating profile or KYC details may improve the next review.';
  }

  get negativeCardActionHint(): string {
    if (this.matchesPrimaryCardTypeOrStatus('SYSTEM_REJECTED')) {
      return 'Recommended next step: contact support and verify the submitted details.';
    }

    if (this.matchesPrimaryCardTypeOrStatus('APPLICATION_REJECTED')) {
      return 'Recommended next step: review the rejection reason and start only when the profile is ready.';
    }

    if (this.matchesPrimaryCardTypeOrStatus('RESTRICTED')) {
      return 'Recommended next step: use the support option below for account clarification.';
    }

    if (this.showNegativeRetryPanel) {
      return 'Recommended next step: improve profile details and retry after the cooldown window.';
    }

    return 'Recommended next step: review your details and try again later.';
  }

  get closedLoanCardMessage(): string {
    if (this.isRejectedReloanDecision) {
      return this.dashboardPrimaryCard?.message ||
        'Your previous loan is closed, but reloan is not available right now.';
    }

    return this.dashboardPrimaryCard?.message ||
      'Loan is closed. No further borrower action is required.';
  }

  get closedLoanReasonText(): string {
    if (this.isRejectedReloanDecision) {
      return this.negativeCardReason;
    }

    const cardData = this.dashboardPrimaryCard?.data || {};
    const reloanDecision = cardData?.reloanDecision || {};

    return this.pickFirstString(
      reloanDecision?.remarks,
      this.ineligibleReason
    );
  }

  get closedLoanRetryDate(): string {
    if (this.isRejectedReloanDecision) {
      return this.negativeCardRetryDate;
    }

    const cardData = this.dashboardPrimaryCard?.data || {};
    const noc = cardData?.noc || {};

    return this.pickFirstString(
      this.retryDate,
      noc?.retryAfter
    );
  }

  get loanJourneyCardTitle(): string {
    return this.dashboardPrimaryCard?.title || 'Loan Application';
  }

  private get primaryCardReloanData(): any {
    const reloanData = this.dashboardPrimaryCard?.data?.reloan;

    return reloanData && typeof reloanData === 'object'
      ? reloanData
      : {};
  }

  get loanJourneyCardMessage(): string {
    return this.dashboardPrimaryCard?.message ||
      `Congratulations! You're now successfully eligible. Your gateway to seamless financial solutions is officially open.`;
  }

  get loanJourneyButtonLabel(): string {
    return this.dashboardPrimaryCard?.cta?.label ||
      (this.loanProgress > 0 ? 'Continue' : 'View & Apply');
  }

  get showLoanJourneyProgress(): boolean {
    return this.loanProgress >= 0 && this.loanProgress < 100;
  }

  get reloanEligibleCardTitle(): string {
    return this.dashboardPrimaryCard?.title || 'You are eligible for reloan';
  }

  get reloanEligibleCardMessage(): string {
    return this.dashboardPrimaryCard?.message ||
      'Your previous loan journey is complete. You can now continue with a new reloan application.';
  }

  get reloanEligibleCardButtonLabel(): string {
    return this.dashboardPrimaryCard?.cta?.label || 'Apply For Reloan';
  }

  get showReloanEligibilityHint(): boolean {
    return this.showReloanActionButton && !this.canApplyReloan;
  }

  get showAssignedContactCard(): boolean {
    return !!this.dashboardPrimaryCardType &&
      !!this.creditManager &&
      !this.showClosedLoanUnavailableCard &&
      !this.showReloanActionButton;
  }

  get showRefreshStatusButton(): boolean {
    return this.isPrimaryCardType(
      'LOAN_APPLICATION_TRACKING',
      'ACTIVE_LOAN',
      'CLOSED_LOAN',
      'RELOAN_NOT_ELIGIBLE',
      'RELOAN_ELIGIBLE'
    );
  }

  get closedLoanSummary(): any | null {
    if (!this.showClosedLoanUnavailableCard) {
      return null;
    }

    const card = this.dashboardPrimaryCard || {};
    const cardData = card?.data || {};
    const summary = cardData?.summary || {};
    const snapshot = this.borrowerSnapshot || {};
    const tracking = this.loanTracking || {};
    const activeLoan = tracking?.activeLoan || {};
    const repayment = tracking?.repayment || {};
    const request = this.currentLoanRequest || {};
    const snapshotOverview = snapshot?.overview || {};
    const trackingOverview = tracking?.overview || {};
    const activeLoanOverview = activeLoan?.overview || {};
    const repaymentOverview = repayment?.overview || {};
    const requestOverview = request?.overview || {};

    const loanAmount = this.pickFirstAmount(
      summary?.loanAmount,
      activeLoan?.approvedAmount,
      tracking?.approvedAmount,
      activeLoan?.principal,
      request?.approvedAmount,
      request?.requestedAmount,
      request?.loanAmount,
      request?.principal
    );
    const disbursedAmount = this.pickFirstAmount(
      summary?.netDisbursalAmount,
      activeLoan?.netDisbursalAmount,
      tracking?.netDisbursalAmount,
      activeLoan?.disbursalAmount,
      tracking?.disbursalAmount,
      request?.netDisbursalAmount,
      request?.disbursalAmount
    );
    const totalPaidAmount = this.pickFirstAmount(
      summary?.totalReceivedAmount,
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
    const currentInterestAmount = this.pickFirstAmount(
      snapshot?.currentInterestAmount,
      snapshotOverview?.currentInterestAmount,
      tracking?.currentInterestAmount,
      trackingOverview?.currentInterestAmount,
      activeLoan?.currentInterestAmount,
      activeLoanOverview?.currentInterestAmount,
      repayment?.currentInterestAmount,
      repaymentOverview?.currentInterestAmount,
      request?.currentInterestAmount,
      requestOverview?.currentInterestAmount,
      explicitInterestPaidAmount,
      interestPaidAmount
    );
    const penaltyInterestPaidAmount = this.pickPositiveAmount(tracking?.penaltyAmount);

    return {
      loanNumber: this.pickFirstString(
        card?.applicationNumber,
        card?.applicationId,
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
          card?.statusCode,
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
      currentInterestAmount,
      penaltyInterestPaidAmount,
      dueDateDisplay: this.formatSnapshotDateForDisplay(
        summary?.dueDate,
        repayment?.nextDueDate,
        tracking?.nextDueDate,
        tracking?.repayDate,
        activeLoan?.repayDate,
        activeLoan?.maturityDate
      ),
      paidDateDisplay: this.formatSnapshotDateForDisplay(
        summary?.paidDate,
        repayment?.paidAt,
        repayment?.repaidAt,
        tracking?.repaidAt,
        tracking?.paidAt
      ),
      ratePerDay: this.pickFirstAmount(summary?.ratePerDay),
      rateAnnualPercent: this.pickFirstAmount(summary?.rateAnnualPercent),
      closedDateDisplay: this.formatSnapshotDateForDisplay(
        summary?.closedOn,
        summary?.paidDate,
        summary?.dueDate,
        cardData?.closedOn,
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

private isPrimaryCardType(...types: string[]): boolean {
  return !!this.dashboardPrimaryCardType && types.includes(this.dashboardPrimaryCardType);
}

private matchesPrimaryCardTypeOrStatus(...types: string[]): boolean {
  const normalizedType = this.normalizeCardKey(this.dashboardPrimaryCardType);
  const normalizedStatusCode = this.normalizeCardKey(this.dashboardPrimaryCard?.statusCode);

  return types.some((type) => {
    const normalizedTarget = this.normalizeCardKey(type);
    return normalizedTarget === normalizedType || normalizedTarget === normalizedStatusCode;
  });
}

private setDashboardPrimaryCard(data: any) {
  const dashboard = data?.dashboard || {};
  const primaryCard = dashboard?.primaryCard || null;

  this.dashboardVersion = this.pickFirstAmount(dashboard?.version);
  this.dashboardPrimaryCard = primaryCard;
  this.dashboardPrimaryCardType =
    this.pickFirstString(primaryCard?.type, dashboard?.primaryCardType) || null;
}

private applyDashboardPrimaryCardState() {
  const cardData = this.dashboardPrimaryCard?.data || {};
  const basicProfilePercent = this.pickFirstAmount(cardData?.percent);
  const applicationPercent = this.pickFirstAmount(cardData?.percent);

  if (this.isPrimaryCardType('BASIC_PROFILE_COMPLETION') && basicProfilePercent !== null) {
    this.profileProgress = basicProfilePercent;
  }

  if (this.isPrimaryCardType('APPLICATION_PROFILE_COMPLETION') && applicationPercent !== null) {
    this.loanProgress = applicationPercent;
  }

  this.showLoanCard = this.isPrimaryCardType(
    'ELIGIBLE',
    'APPLICATION_PROFILE_COMPLETION',
    'CURRENT_LOAN_REQUEST'
  );
  this.showTracker = this.isPrimaryCardType('LOAN_APPLICATION_TRACKING');
  this.creditManager = this.resolveDashboardContactDetail();

  this.patchTrackerFromSnapshot();
  this.patchActiveLoanFromSnapshot();
}

private resolveDashboardContactDetail(): any {
  const primaryCardContact = this.dashboardPrimaryCard?.contactDetail;

  if (primaryCardContact && typeof primaryCardContact === 'object') {
    return {
      name: this.pickFirstString(primaryCardContact?.name, primaryCardContact?.roleName, 'Support'),
      mobile: this.pickFirstString(primaryCardContact?.phone),
      email: this.pickFirstString(primaryCardContact?.email),
      role: this.pickFirstString(primaryCardContact?.roleName, primaryCardContact?.roleCode, 'Support')
    };
  }

  const creditManagerDetail =
    this.loanTracking?.creditManagerDetail ||
    this.loanTracking?.assignedRoleDetails?.find((role: any) => role?.roleCode === 'CREDIT_MANAGER') ||
    this.loanTracking?.assignedRoleDetails?.[0];

  return creditManagerDetail ? {
    name: creditManagerDetail?.name,
    mobile: creditManagerDetail?.phone || creditManagerDetail?.contact,
    email: creditManagerDetail?.email,
    role: creditManagerDetail?.roleName || creditManagerDetail?.roleCode
  } : null;
}

handleBasicProfileAction() {
  this.router.navigate(['/dashboard/profile']);
}

handleLoanJourneyAction() {
  this.router.navigate(['/dashboard/loan']);
}

handleSupportAction() {
  const phone = this.pickFirstString(
    this.dashboardPrimaryCard?.cta?.phone,
    this.creditManager?.mobile
  );
  const email = this.pickFirstString(
    this.dashboardPrimaryCard?.cta?.email,
    this.creditManager?.email
  );

  if (phone && typeof window !== 'undefined') {
    window.location.href = `tel:${phone}`;
    return;
  }

  if (email && typeof window !== 'undefined') {
    window.location.href = `mailto:${email}`;
    return;
  }

  this.toastr.info('Support details are not available right now.');
}

handleReloanCardAction() {
  this.applyReloan();
}

getBorrowerSnapshot() {
  this.getBorrowerSnapshotWithOptions(true);
}

private getBorrowerSnapshotWithOptions(
  showLoader = true,
  onComplete?: () => void,
  skipApplicationStatusRefresh = false
) {
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
      this.applyBorrowerSnapshotData(data, showLoader, onComplete, skipApplicationStatusRefresh);
    },
    error: () => {
      if (showLoader) {
        this.spinner.hide();
      }
      onComplete?.();
    }
  });
}

private applyBorrowerSnapshotData(
  data: any,
  showLoader = true,
  onComplete?: () => void,
  skipApplicationStatusRefresh = false
) {
  const wasReloanCardVisible = this.showReloanActionButton;
  const offer = data?.offer || {};
  const eligibility = data?.eligibility || {};

  this.setDashboardPrimaryCard(data);
  this.borrowerSnapshot = data || null;
  this.applicationId =
    data?.application?.id ||
    this.dashboardPrimaryCard?.applicationId ||
    this.applicationId ||
    '';
  this.profileProgress = data?.basicFlow?.percent || 0;
  this.loanProgress = data?.applicationFlow?.percent || 0;
  this.overallProgress = data?.progressPercent || 0;
  this.loanTracking = data?.loanTracking || null;
  this.currentLoanRequest = data?.currentLoanRequest || null;
  this.reloanDecision = this.resolveLatestReloanDecision(
    data,
    this.loanTracking,
    this.currentLoanRequest
  );
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
  this.applyEligibilityState(offer, eligibility);
  this.applyDashboardPrimaryCardState();
  this.clearPendingEnachMandateIfCompleted(this.trackingSteps);

  this.triggerReloanSnapshotRefreshOnFirstCardShow(wasReloanCardVisible);

  if (this.showTracker && !skipApplicationStatusRefresh) {
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
  void this.refreshStatus();
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
  if (this.dashboardPrimaryCardType && !this.showTracker) {
    return;
  }

  if (this.showTracker) {
    const trackerSteps =
      this.dashboardPrimaryCard?.data?.steps ||
      this.loanTracking?.steps ||
      this.steps;

    if (trackerSteps && Object.keys(trackerSteps).length > 0) {
      this.trackingSteps = this.buildTrackerSteps(trackerSteps);
    }

    this.currentTitle =
      this.dashboardPrimaryCard?.title ||
      this.loanTracking?.currentTitle ||
      this.loanTracking?.currentStage ||
      this.currentTitle;
    this.currentMessage =
      this.dashboardPrimaryCard?.message ||
      this.loanTracking?.currentMessage ||
      this.currentMessage;
    return;
  }

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
  const existingRequest = this.currentLoanRequest || {};
  const incomingTracking = statusData?.loanTracking || {};
  const incomingRequest = statusData?.currentLoanRequest || {};
  const incomingVideoKyc = statusData?.videoKyc || incomingTracking?.videoKyc || {};
  const incomingNextAction = statusData?.nextAction || incomingTracking?.nextAction;
  const shouldPreserveRepaymentRefreshTracking =
    this.shouldPreserveRepaymentRefreshTracking(existingTracking, incomingTracking);
  const mergedRepayment = shouldPreserveRepaymentRefreshTracking
    ? {
        ...(incomingTracking?.repayment || {}),
        ...(existingTracking?.repayment || {})
      }
    : {
        ...(existingTracking?.repayment || {}),
        ...(incomingTracking?.repayment || {})
      };
  const mergedActiveLoan = shouldPreserveRepaymentRefreshTracking
    ? {
        ...(incomingTracking?.activeLoan || {}),
        ...(existingTracking?.activeLoan || {})
      }
    : {
        ...(existingTracking?.activeLoan || {}),
        ...(incomingTracking?.activeLoan || {})
      };
  const mergedTracking = {
    ...(shouldPreserveRepaymentRefreshTracking ? incomingTracking : existingTracking),
    ...(shouldPreserveRepaymentRefreshTracking ? existingTracking : incomingTracking),
    repayment: mergedRepayment,
    activeLoan: mergedActiveLoan,
    videoKyc: {
      ...(existingTracking?.videoKyc || {}),
      ...(incomingVideoKyc || {})
    },
    nextAction: this.resolveNextAction(existingTracking?.nextAction, incomingNextAction)
  };
  const mergedCurrentLoanRequest =
    incomingRequest && Object.keys(incomingRequest).length > 0
      ? {
          ...existingRequest,
          ...incomingRequest
        }
      : this.currentLoanRequest;

  this.loanTracking = mergedTracking;
  this.currentLoanRequest = mergedCurrentLoanRequest;
  this.reloanDecision = this.resolveLatestReloanDecision(
    statusData,
    mergedTracking,
    mergedCurrentLoanRequest,
    this.reloanDecision
  );
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
  if (!this.isPrimaryCardType('ACTIVE_LOAN')) {
    this.showActiveLoanCard = false;
    this.activeLoan = null;
    return;
  }

  const tracking = this.loanTracking || {};
  const cardData = this.dashboardPrimaryCard?.data || {};
  const summary = cardData?.summary || {};
  const activeLoan = cardData?.activeLoan || tracking?.activeLoan || {};
  const repayment = cardData?.repayment || tracking?.repayment || {};
  this.showActiveLoanCard = true;

  this.activeLoan = {
    loanNumber: this.pickFirstString(
      this.dashboardPrimaryCard?.applicationNumber,
      this.dashboardPrimaryCard?.applicationId,
      tracking?.applicationNumber,
      activeLoan?.loanNumber,
      activeLoan?.loanAccountNo,
      tracking?.loanAccountNo,
      tracking?.loanId
    ),
    status: this.pickFirstString(
      this.dashboardPrimaryCard?.statusCode,
      tracking?.loanStatus,
      activeLoan?.loanStatus,
      tracking?.currentTitle,
      activeLoan?.status
    ) || 'ACTIVE',
    approvedAmount: this.pickFirstAmount(
      summary?.loanAmount,
      activeLoan?.approvedAmount,
      tracking?.approvedAmount,
      activeLoan?.principal
    ),
    disbursedAmount: this.pickFirstAmount(
      summary?.netDisbursalAmount,
      activeLoan?.netDisbursalAmount,
      tracking?.netDisbursalAmount,
      activeLoan?.disbursalAmount
    ),
    totalReceivedAmount: this.pickFirstAmount(
      summary?.totalReceivedAmount,
      repayment?.totalPaidAmount,
      repayment?.paidAmount,
      tracking?.totalPaidAmount
    ),
    ratePerDay: this.pickFirstAmount(summary?.ratePerDay),
    rateAnnualPercent: this.pickFirstAmount(summary?.rateAnnualPercent),
    repayDateDisplay: this.formatSnapshotDateForDisplay(
      summary?.dueDate,
      repayment?.nextDueDate,
      tracking?.nextDueDate,
      tracking?.repayDate,
      activeLoan?.repayDate,
      activeLoan?.maturityDate
    ),
    payableNowAmount: this.pickFirstAmount(
      summary?.currentOutstandingAmount,
      repayment?.finalDueAmount,
      repayment?.outstandingAmount,
      tracking?.finalDueAmount,
      tracking?.outstandingAmount,
      activeLoan?.outstandingAmount
    ),
    delayDays: this.pickFirstAmount(
      repayment?.delayDays,
      tracking?.delayDays,
      activeLoan?.delayDays
    )
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
  const request = this.currentLoanRequest || {};

  return this.hasClosedLoanTracking(tracking) ||
    request?.isClosed === true ||
    request?.closed === true ||
    this.isClosedLoanStatus(request?.loanStatus) ||
    this.isClosedLoanStatus(request?.status);
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
    const hasExplicitFalseFlag = this.getReloanAvailabilityCandidates().some((value) => value === false);

  return hasExplicitFalseFlag || (
    this.hasEvaluatedEligibility &&
    !this.isEligible &&
    !this.hasExplicitReloanEligibleFlag()
  );
  }

  private hasExplicitReloanEligibleFlag(): boolean {
    return this.getReloanAvailabilityCandidates().some((value) => value === true);
  }

  private hasExplicitReloanAvailabilitySignal(
    trackingSource?: any,
    requestSource?: any
  ): boolean {
    return this.getReloanAvailabilityCandidates(trackingSource, requestSource)
      .some((value) => typeof value === 'boolean');
  }

  private getReloanAvailabilityCandidates(
    trackingSource?: any,
    requestSource?: any
  ): Array<boolean | null | undefined> {
    const tracking = trackingSource || this.loanTracking || {};
    const request = requestSource || this.currentLoanRequest || {};

    return [
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
  }

private getReloanDecisionState(): 'pending' | 'not_eligible' | 'eligible' | 'none' {
  const hasPendingClosureSync = this.isPendingLoanClosureSync();

  if (!this.hasClosedLoan() && !hasPendingClosureSync) {
    return 'none';
  }

  const reloanDecision = this.reloanDecision;

  if (!reloanDecision || typeof reloanDecision !== 'object') {
    if (this.hasExplicitReloanEligibleFlag()) {
      return 'eligible';
    }

    if (this.hasExplicitReloanUnavailableFlag()) {
      return 'not_eligible';
    }

    return 'pending';
  }

  if (!this.isReloanDecisionSaved(reloanDecision)) {
    if (this.hasExplicitReloanEligibleFlag()) {
      return 'eligible';
    }

    return 'pending';
  }

  return reloanDecision?.eligible === true ? 'eligible' : 'not_eligible';
}

private isReloanDecisionSaved(reloanDecision: any): boolean {
  return reloanDecision?.saved === true || reloanDecision?.isSaved === true;
}

private shouldPreserveRepaymentRefreshTracking(existingTracking: any, incomingTracking: any): boolean {
  if (!this.isRepaymentRefreshContext) {
    return false;
  }

  const existingSignalsClosed =
    this.hasClosedLoanTracking(existingTracking) ||
    this.hasClearedLoanBalance(existingTracking);
  const incomingSignalsClosed =
    this.hasClosedLoanTracking(incomingTracking) ||
    this.hasClearedLoanBalance(incomingTracking);

  if (!existingSignalsClosed || incomingSignalsClosed) {
    return false;
  }

  return incomingTracking?.showActiveLoanCard === true ||
    this.hasOpenRepaymentBalance(incomingTracking);
}

private hasClosedLoanTracking(trackingSource?: any): boolean {
  const tracking = trackingSource || {};
  const activeLoan = tracking?.activeLoan || {};
  const statusCandidates = [
    tracking?.loanStatus,
    activeLoan?.status,
    activeLoan?.loanStatus,
    tracking?.repayment?.loanStatus
  ];
  const statusClosed = statusCandidates.some((status) => this.isClosedLoanStatus(status));

  return statusClosed ||
    tracking?.isLoanClosed === true ||
    tracking?.loanClosed === true ||
    activeLoan?.isClosed === true ||
    activeLoan?.closed === true;
}

private hasOpenRepaymentBalance(trackingSource?: any): boolean {
  const tracking = trackingSource || {};
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

  return dueAmounts.some((amount) => amount > 0);
}

private shouldTreatClosedLoanAsPendingDuringRefresh(): boolean {
  return this.isRepaymentRefreshContext &&
    this.hasClosedLoanOrPendingClosureSync() &&
    !this.showActiveLoanCard;
}

private resolveLatestReloanDecision(
  source: any,
  trackingSource?: any,
  requestSource?: any,
  fallbackDecision: any = null
): any {
  const reloanDecision =
    this.extractReloanDecision(source) ||
    this.extractReloanDecision({ loanTracking: trackingSource, currentLoanRequest: requestSource });

  if (reloanDecision && typeof reloanDecision === 'object') {
    return reloanDecision;
  }

  if (this.hasExplicitReloanAvailabilitySignal(trackingSource, requestSource)) {
    return null;
  }

  return fallbackDecision;
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

private getPrimaryCardCtaUrl(cardSource?: any): string {
  const card = cardSource ?? this.dashboardPrimaryCard;
  const url =
    card?.cta?.url ||
    card?.data?.reloanUrl ||
    card?.data?.nocUrl ||
    '';

  return typeof url === 'string' ? url.trim() : '';
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
  if (nextActionSource === undefined) {
    const primaryCardUrl = this.getPrimaryCardCtaUrl();

    if (primaryCardUrl) {
      return primaryCardUrl;
    }
  }

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

private openExternalUrl(url: string, newTab = false) {
  if (!url || typeof window === 'undefined') {
    return;
  }

  if (newTab) {
    window.open(url, '_blank', 'noopener');
    return;
  }

  window.location.href = url;
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

private pickPositiveAmount(candidate: any): number | null {
  const numericValue = Number(candidate);

  return Number.isFinite(numericValue) && numericValue > 0
    ? numericValue
    : null;
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

private formatStatusLabel(value: any): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .trim()
    .toLowerCase()
    .split(/[_\s]+/)
    .filter((part) => !!part)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

private normalizeCardKey(value: any): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toUpperCase().replace(/\s+/g, '_');
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
  const wasReloanCardVisible = this.showReloanActionButton;
  const wasDisbursementCompleted = this.isDisbursementCompleted();

  this.syncTrackerRuntimeState(data);
  this.updateTrackerFlow(data?.statusFlow || this.loanTracking?.statusFlow);
  this.trackingSteps = this.buildTrackerSteps(data?.steps || this.trackingSteps || {});
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
  this.applyDashboardPrimaryCardState();
  this.clearPendingEnachMandateIfCompleted(this.trackingSteps);

  this.triggerReloanSnapshotRefreshOnFirstCardShow(wasReloanCardVisible);

  if (!wasDisbursementCompleted && this.isDisbursementCompleted()) {
    this.getBorrowerSnapshotWithOptions(false);
  }
}

private triggerReloanSnapshotRefreshOnFirstCardShow(wasReloanCardVisible: boolean) {
  if (!this.showReloanActionButton) {
    this.hasTriggeredReloanSnapshotRefresh = false;
    return;
  }

  if (this.canApplyReloan) {
    this.hasTriggeredReloanSnapshotRefresh = false;
    return;
  }

  if (wasReloanCardVisible || this.hasTriggeredReloanSnapshotRefresh) {
    return;
  }

  this.hasTriggeredReloanSnapshotRefresh = true;
  this.getBorrowerSnapshotWithOptions(false, undefined, true);
}

private hasReachedRepaymentRefreshTarget(): boolean {
  return this.hasVisibleRepaymentClosureOutcome();
}

private hasVisibleRepaymentClosureOutcome(): boolean {
  return this.showClosedLoanUnavailableCard || this.showReloanActionButton;
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
  this.applicationStatusApi();
  return;

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


async refreshStatus() {
  if (this.isRefreshStatusInFlight) {
    return;
  }

  if (!this.showTracker) {
    this.getBorrowerSnapshot();
    return;
  }

  this.isRefreshStatusInFlight = true;
  this.spinner.show();

  try {
    await this.refreshTrackerStepsSequentially();
  } finally {
    this.isRefreshStatusInFlight = false;
    this.spinner.hide();
  }
}

openRepayment(): void {
  if (!this.applicationId) {
    this.toastr.error('Application not found');
    return;
  }

  this.router.navigate(['/dashboard/profile/loan-repay', this.applicationId]);
}

private async refreshTrackerStepsSequentially() {
  await this.refreshBorrowerSnapshotSilently();

  for (const stepKey of this.refreshableTrackerSteps) {
    if (!this.shouldShowTrackerStep(stepKey) || !this.isTrackerStepPending(stepKey)) {
      continue;
    }

    const didRefreshStep = await this.refreshTrackerStepSilently(stepKey);
    if (!didRefreshStep) {
      continue;
    }

    await this.refreshApplicationStatusSilently();
  }
}

private isTrackerStepPending(stepKey: string): boolean {
  return this.normalizeTrackerStatus(this.trackingSteps?.[stepKey]) === 'PENDING';
}

private refreshBorrowerSnapshotSilently(): Promise<void> {
  return new Promise((resolve) => {
    this.getBorrowerSnapshotWithOptions(false, resolve);
  });
}

private refreshApplicationStatusSilently(): Promise<void> {
  return new Promise((resolve) => {
    this.applicationStatusApi(false, resolve);
  });
}

private async refreshTrackerStepSilently(stepKey: RefreshableTrackerStep): Promise<boolean> {
  switch (stepKey) {
    case 'sanction':
      return this.prefetchSanctionSilently();
    case 'esign':
      return this.prefetchEsignSilently();
    case 'enach':
      return this.refreshEnachSilently();
    default:
      return false;
  }
}

private async refreshVideoKycSilently(): Promise<boolean> {
  return false;

  if (!this.applicationId || this.isVideoKycRefreshInFlight) {
    return false;
  }

  this.isVideoKycRefreshInFlight = true;

  try {
    const res = await firstValueFrom(
      this.contentService.videoRefresh({ applicationId: this.applicationId })
    );

    return !!res?.success;
  } catch (error) {
    console.error('Video KYC refresh failed', error);
    return false;
  } finally {
    this.isVideoKycRefreshInFlight = false;
  }
}

private async prefetchSanctionSilently(): Promise<boolean> {
  if (!this.applicationId) {
    return false;
  }

  try {
    const res = await firstValueFrom(
      this.contentService.sanctionEsignLink(this.applicationId)
    );
    const url = res?.data?.sanctionLetterUrl;

    if (!res?.success || !url) {
      return false;
    }

    this.sanctionUrl = url;
    this.otpData = res?.data?.otp || this.otpData;
    return true;
  } catch (error) {
    console.error('Sanction link refresh failed', error);
    return false;
  }
}

private async prefetchEsignSilently(): Promise<boolean> {
  if (!this.applicationId) {
    return false;
  }

  try {
    const res = await firstValueFrom(
      this.contentService.esignLink(this.applicationId)
    );
    const url = res?.data?.esignUrl || res?.data?.redirectUrl;

    if (!res?.success || !url) {
      return false;
    }

    this.esignUrl = url;
    this.esignUrlSafe =
      this.sanitizer.bypassSecurityTrustResourceUrl(url);
    return true;
  } catch (error) {
    console.error('eSign link refresh failed', error);
    return false;
  }
}

private async ensureEnachMandateReady(): Promise<boolean> {
  if (!this.applicationId) {
    return false;
  }

  this.restorePendingEnachMandateRowId();

  if (this.mandateRowId) {
    return true;
  }

  try {
    const res = await firstValueFrom(
      this.contentService.createMandate({ applicationId: this.applicationId })
    );

    if (!res?.success) {
      return false;
    }

    this.mandateRowId = String(res?.data?.mandateRowId || '').trim();
    if (!this.mandateRowId) {
      return false;
    }

    this.persistPendingEnachMandateRowId(this.mandateRowId);

    const url = res?.data?.authUrl;
    if (url) {
      this.enachUrl = url;
      this.enachUrlSafe =
        this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }

    return true;
  } catch (error) {
    console.error('Create mandate failed during refresh', error);
    return false;
  }
}

private async refreshEnachSilently(): Promise<boolean> {
  if (this.isEnachRefreshInFlight) {
    return false;
  }

  const isMandateReady = await this.ensureEnachMandateReady();
  if (!isMandateReady || !this.mandateRowId) {
    return false;
  }

  this.isEnachRefreshInFlight = true;

  try {
    const res = await firstValueFrom(
      this.contentService.mendateRefresh({ mandateRowId: this.mandateRowId })
    );

    if (!res?.success) {
      return false;
    }

    this.shouldRefreshEnachOnReturn = true;
    this.persistPendingEnachReturnRefresh(true);
    return true;
  } catch (error) {
    console.error('Mandate refresh failed', error);
    return false;
  } finally {
    this.isEnachRefreshInFlight = false;
  }
}



}
