import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { Subscription, filter } from 'rxjs';
import { ContentService } from '../../../service/content.service';

@Component({
  selector: 'app-loan-application-home',
  templateUrl: './loan-application-home.component.html',
  styleUrls: ['./loan-application-home.component.css'],
})
export class LoanApplicationHomeComponent implements OnInit, OnDestroy {
  private readonly firstVisitHardRefreshStorageKey =
    'loanApplicationHome.firstVisitHardRefreshDone';
  private readonly hardRefreshPendingStorageKey =
    'loanApplicationHome.firstVisitHardRefreshPending';

  flowSteps: any = {};
  flowPercent = 0;
  currentNextActionCode = '';
  isSkippingFetchBankStatement = false;
  private readonly stepSequence = [
    'loanCalculator',
    'employmentDetails',
    'aadhaarEKyc',
    'fetchBankStatement',
    'references',
    'documents',
    'disbursalBankDetails',
  ];
  private readonly stepCompletionRefreshPollDelayMs = 1000;
  private readonly stepCompletionRefreshSafetyTimeoutMs = 60000;
  private stepCompletionRefreshStartedAt = 0;
  private stepCompletionRefreshTimeouts: Array<ReturnType<typeof setTimeout>> = [];
  private pendingCompletionStep = '';
  private isStepCompletionRefreshInProgress = false;
  private stepCompletionRefreshOnFinish: (() => void) | null = null;

  applicationId = '';
  routeSub!: Subscription;
  navigationSub!: Subscription;
  private lastReturnRefreshAt = 0;
  private readonly returnRefreshCooldownMs = 500;

  stepNumbers: any = {
    loanCalculator: 1,
    employmentDetails: 2,
    aadhaarEKyc: 3,
    fetchBankStatement: 4,
    references: 5,
    documents: 6,
    disbursalBankDetails: 7,
  };

  stepActionCodes: any = {
    employmentDetails: ['EMPLOYMENT_DETAILS'],
    aadhaarEKyc: ['AADHAAR_EKYC', 'AADHAAR_E_KYC', 'EKYC', 'EKYC_VERIFICATION'],
    fetchBankStatement: ['FETCH_BANK_STATEMENT', 'FETCHBANKSTATEMENT', 'BANK_STATEMENT_FETCH'],
    references: ['REFERENCES', 'REFERENCE', 'ADD_REFERENCE'],
    documents: ['DOCUMENTS', 'DOCUMENT_VERIFICATION', 'BANK_STATEMENT_DOCUMENT', 'SALARY_SLIP'],
    disbursalBankDetails: ['DISBURSAL', 'DISBURSAL_BANK_DETAILS'],
  };

  constructor(
    private contentService: ContentService,
    private router: Router,
    private spinner: NgxSpinnerService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    if (this.triggerFirstVisitHardRefresh()) {
      return;
    }

    this.routeSub = this.route.queryParams.subscribe((params) => {
      const completedStep = this.normalizeStepKey(params?.['completedStep']);

      if (completedStep) {
        this.refreshSnapshotUntilStepCompleted(completedStep);
        return;
      }

      this.getBorrowerSnapshot();
    });

    this.navigationSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        if (this.isLoanHomeUrl(event.urlAfterRedirects)) {
          this.refreshSnapshotOnReturn();
        }
      });
  }

  getStepNumber(step: string): number {
    return this.stepNumbers[step];
  }

  ngOnDestroy(): void {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }

    if (this.navigationSub) {
      this.navigationSub.unsubscribe();
    }

    this.finishStepCompletionRefresh();
    this.resetHardRefreshGuardForNextVisit();
  }

  @HostListener('window:focus')
  onWindowFocus(): void {
    this.refreshSnapshotOnReturn();
  }

  @HostListener('window:pageshow')
  onWindowPageShow(): void {
    this.refreshSnapshotOnReturn();
  }

  @HostListener('document:visibilitychange')
  onDocumentVisibilityChange(): void {
    if (typeof document !== 'undefined' && !document.hidden) {
      this.refreshSnapshotOnReturn();
    }
  }

  private triggerFirstVisitHardRefresh(): boolean {
    if (!this.canUseSessionStorage()) {
      return false;
    }

    if (sessionStorage.getItem(this.hardRefreshPendingStorageKey) === 'true') {
      sessionStorage.removeItem(this.hardRefreshPendingStorageKey);
      return false;
    }

    if (sessionStorage.getItem(this.firstVisitHardRefreshStorageKey) === 'true') {
      return false;
    }

    sessionStorage.setItem(this.firstVisitHardRefreshStorageKey, 'true');
    sessionStorage.setItem(this.hardRefreshPendingStorageKey, 'true');
    this.reloadCurrentPage();
    return true;
  }

  private resetHardRefreshGuardForNextVisit(): void {
    if (!this.canUseSessionStorage()) {
      return;
    }

    if (sessionStorage.getItem(this.hardRefreshPendingStorageKey) === 'true') {
      return;
    }

    sessionStorage.removeItem(this.firstVisitHardRefreshStorageKey);
    sessionStorage.removeItem(this.hardRefreshPendingStorageKey);
  }

  private reloadCurrentPage(): void {
    window.location.reload();
  }

  private canUseSessionStorage(): boolean {
    return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
  }

  private refreshSnapshotOnReturn(): void {
    if (this.isStepCompletionRefreshInProgress) {
      return;
    }

    if (!this.canTriggerReturnRefresh()) {
      return;
    }

    this.getBorrowerSnapshot();
  }

  private canTriggerReturnRefresh(): boolean {
    if (typeof Date === 'undefined') {
      return true;
    }

    const now = Date.now();

    if (now - this.lastReturnRefreshAt < this.returnRefreshCooldownMs) {
      return false;
    }

    this.lastReturnRefreshAt = now;
    return true;
  }

  private isLoanHomeUrl(url: string): boolean {
    const normalizedUrl = String(url || '')
      .split('?')[0]
      .split('#')[0]
      .replace(/\/+$/, '');

    return normalizedUrl === '/dashboard/loan';
  }

  /* ================= SNAPSHOT ================= */
  getBorrowerSnapshot(manageSpinner = true, onSettled?: () => void) {
    this.lastReturnRefreshAt = Date.now();

    if (manageSpinner) {
      this.spinner.show();
    }

    this.contentService.getBorrowerSnapshot().subscribe({
      next: (res: any) => {
        if (manageSpinner) {
          this.spinner.hide();
        }

        if (res?.success) {
          this.applicationId = res.data?.application?.id || '';

          const appFlow = res.data?.applicationFlow;
          this.flowSteps = appFlow?.steps || {};
          this.flowPercent = appFlow?.percent || 0;
          this.currentNextActionCode = this.normalizeActionToken(
            this.resolveNextActionCode(appFlow?.nextAction),
          );
        }

        onSettled?.();
      },
      error: () => {
        if (manageSpinner) {
          this.spinner.hide();
        }

        console.error('Failed to load application flow');
        onSettled?.();
      },
    });
  }

  /* ================= HELPERS ================= */
  isCompleted(step: string): boolean {
    return this.flowSteps?.[step] === true || this.hasStepBeenPassedByNextAction(step);
  }

  isActive(step: string): boolean {
    return this.getCurrentActiveStep() === step;
  }

  isLocked(step: string): boolean {
    const activeStep = this.getCurrentActiveStep();

    if (!activeStep) {
      return true;
    }

    if (this.isCompleted(step)) {
      return true;
    }

    return activeStep !== step;
  }

  private isNextActionStep(step: string): boolean {
    const actionCodes = this.stepActionCodes?.[step] || [];
    return Array.isArray(actionCodes) && actionCodes.includes(this.currentNextActionCode);
  }

  private getCurrentActiveStep(): string {
    const nextActionStep = this.getNextActionStep();

    if (nextActionStep) {
      return nextActionStep;
    }

    return this.stepSequence.find((step) => !this.isCompleted(step)) || '';
  }

  private getNextActionStep(): string {
    return this.stepSequence.find((step) => this.isNextActionStep(step)) || '';
  }

  private hasStepBeenPassedByNextAction(step: string): boolean {
    const nextActionStep = this.getNextActionStep();

    if (!nextActionStep) {
      return false;
    }

    return this.getStepIndex(step) < this.getStepIndex(nextActionStep);
  }

  private getStepIndex(step: string): number {
    return this.stepSequence.indexOf(step);
  }

  private resolveNextActionCode(nextAction: any): string {
    if (typeof nextAction === 'string') {
      return nextAction;
    }

    return nextAction?.code || nextAction?.name || nextAction?.action || '';
  }

  private normalizeActionToken(value: any): string {
    return String(value ?? '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private normalizeStepKey(value: any): string {
    const step = String(value ?? '').trim();
    return this.stepSequence.includes(step) ? step : '';
  }

  private refreshSnapshotUntilStepCompleted(step: string, onFinish?: () => void) {
    this.pendingCompletionStep = step;
    this.stepCompletionRefreshOnFinish = onFinish || null;
    this.clearStepCompletionRefreshTimeouts();
    this.stepCompletionRefreshStartedAt = Date.now();
    this.isStepCompletionRefreshInProgress = true;
    this.spinner.show();
    this.runStepCompletionRefreshAttempt();
  }

  private runStepCompletionRefreshAttempt(delayMs = 0) {
    const targetStep = this.pendingCompletionStep;

    if (!targetStep) {
      this.finishStepCompletionRefresh();
      return;
    }

    const timeout = setTimeout(() => {
      this.getBorrowerSnapshot(false, () => {
        if (
          this.hasReachedStepCompletionRefreshTarget(targetStep) ||
          this.hasExceededStepCompletionRefreshSafetyTimeout()
        ) {
          this.finishStepCompletionRefresh();
          return;
        }

        this.runStepCompletionRefreshAttempt(this.stepCompletionRefreshPollDelayMs);
      });
    }, delayMs);

    this.stepCompletionRefreshTimeouts.push(timeout);
  }

  private hasReachedStepCompletionRefreshTarget(step: string): boolean {
    return this.isCompleted(step);
  }

  private hasExceededStepCompletionRefreshSafetyTimeout(): boolean {
    return this.stepCompletionRefreshStartedAt > 0 &&
      Date.now() - this.stepCompletionRefreshStartedAt >=
        this.stepCompletionRefreshSafetyTimeoutMs;
  }

  private clearStepCompletionRefreshTimeouts() {
    this.stepCompletionRefreshTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.stepCompletionRefreshTimeouts = [];
  }

  private finishStepCompletionRefresh() {
    const onFinish = this.stepCompletionRefreshOnFinish;

    this.clearStepCompletionRefreshTimeouts();
    this.pendingCompletionStep = '';
    this.stepCompletionRefreshStartedAt = 0;
    this.stepCompletionRefreshOnFinish = null;

    if (this.isStepCompletionRefreshInProgress) {
      this.isStepCompletionRefreshInProgress = false;
      this.spinner.hide();
    }

    onFinish?.();
  }

  navigate(step: string, route: string) {
    if (step === 'fetchBankStatement' && this.isSkippingFetchBankStatement) {
      return;
    }

    if (this.isLocked(step)) {
      return;
    }

    this.router.navigate([route]);
  }

  submitApplication() {
    if (this.flowPercent !== 100) {
      return;
    }

    this.router.navigate(['/dashboard']);
  }

  /* ================= SKIP ================= */
  skipProcess(event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();

    if (this.isSkippingFetchBankStatement) {
      return;
    }

    if (!this.applicationId) {
      console.error('Application ID missing');
      return;
    }

    this.isSkippingFetchBankStatement = true;
    this.spinner.show();

    this.contentService.skipFetchBankStatement(this.applicationId).subscribe({
      next: (res: any) => {
        if (res?.success === false) {
          this.isSkippingFetchBankStatement = false;
          this.spinner.hide();
          console.error('Skip failed');
          return;
        }

        // Move the UI forward immediately while the latest snapshot is fetched.
        this.flowSteps = {
          ...this.flowSteps,
          fetchBankStatement: true,
        };

        this.refreshSnapshotUntilStepCompleted('fetchBankStatement', () => {
          this.isSkippingFetchBankStatement = false;
        });
      },
      error: () => {
        this.isSkippingFetchBankStatement = false;
        this.spinner.hide();
        console.error('Skip failed');
      }
    });
  }
}
