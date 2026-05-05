import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ContentService } from '../../../../service/content.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { getFirstApiErrorMessage } from '../../../../service/api-error.util';

declare var bootstrap: any;

@Component({
  selector: 'app-e-kyc-verification',
  templateUrl: './e-kyc-verification.component.html',
  styleUrl: './e-kyc-verification.component.css',
})
export class EKYCVerificationComponent implements OnInit {
  requestId = '';
  applicationId = '';
  showSuccessModal = false;
  isLoadingApplication = false;
  isVerifying = false;
  isResolvingNextStep = false;

  private readonly postEkycStepRoutes: Array<{ step: string; route: string }> = [
    { step: 'fetchBankStatement', route: '/dashboard/loan/bank' },
    { step: 'references', route: '/dashboard/loan/reference' },
    { step: 'documents', route: '/dashboard/loan/bank-statement' },
    { step: 'disbursalBankDetails', route: '/dashboard/loan/disbursal' },
  ];

  private readonly nextActionRouteMap: Record<string, string> = {
    FETCH_BANK_STATEMENT: '/dashboard/loan/bank',
    FETCHBANKSTATEMENT: '/dashboard/loan/bank',
    BANK_STATEMENT_FETCH: '/dashboard/loan/bank',
    REFERENCES: '/dashboard/loan/reference',
    REFERENCE: '/dashboard/loan/reference',
    ADD_REFERENCE: '/dashboard/loan/reference',
    DOCUMENTS: '/dashboard/loan/bank-statement',
    DOCUMENT_VERIFICATION: '/dashboard/loan/bank-statement',
    BANK_STATEMENT_DOCUMENT: '/dashboard/loan/bank-statement',
    SALARY_SLIP: '/dashboard/loan/salary-slip',
    DISBURSAL: '/dashboard/loan/disbursal',
    DISBURSAL_BANK_DETAILS: '/dashboard/loan/disbursal',
  };

  private readonly allowedPostEkycRoutes = new Set([
    '/dashboard/loan',
    '/dashboard/loan/bank',
    '/dashboard/loan/reference',
    '/dashboard/loan/bank-statement',
    '/dashboard/loan/salary-slip',
    '/dashboard/loan/documents',
    '/dashboard/loan/disbursal',
  ]);

  constructor(
    private route: ActivatedRoute,
    private contentService: ContentService,
    private router: Router,
    private spinner: NgxSpinnerService,
    private toastr: ToastrService
  ) {}

  private openEkycError(reason = ''): void {
    this.router.navigate(['/dashboard/loan/ekyc-error'], {
      queryParams: reason ? { reason } : undefined,
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.requestId = params['requestId'] || '';
      const status = params['status'];
      const reason = params['reason'] || '';

      if (!this.requestId || status !== 'success') {
        this.openEkycError(reason);
        return;
      }

      this.getBorrowerSnapshot();
    });
  }

  getBorrowerSnapshot() {
    this.isLoadingApplication = true;

    this.contentService.getBorrowerSnapshot().subscribe(res => {
      this.isLoadingApplication = false;

      if (res?.success) {
        this.applicationId = res.data.application.id;
        return;
      }

      this.openEkycError(getFirstApiErrorMessage(res, 'Unable to load application details'));
    }, () => {
      this.isLoadingApplication = false;
      this.openEkycError('Unable to load application details');
    });
  }

  verifyEkyc() {
    if (!this.requestId || !this.applicationId || this.isLoadingApplication || this.isVerifying) {
      this.toastr.warning('Please wait, verification details are still loading.');
      return;
    }

    const payload = {
      requestId: this.requestId,
      applicationId: this.applicationId
    };

    this.isVerifying = true;
    this.spinner.show();

    this.contentService.verifyEkyc(payload).subscribe({
      next: (res: any) => {
        this.isVerifying = false;
        this.spinner.hide();

        if (res?.success) {
          this.openSuccessModal();
        } else {
          this.openEkycError(getFirstApiErrorMessage(res));
        }
      },
      error: (err) => {
        this.isVerifying = false;
        this.spinner.hide();
        this.openEkycError(getFirstApiErrorMessage(err));
      }
    });
  }

  /* ================= MODAL CONTROLS ================= */

  openSuccessModal() {
    const modalEl = document.getElementById('ekycSuccessModal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }

  onSuccessOk() {
    if (this.isResolvingNextStep) {
      return;
    }

    this.isResolvingNextStep = true;
    this.spinner.show();

    this.contentService.getBorrowerSnapshot().subscribe({
      next: (res: any) => {
        this.isResolvingNextStep = false;
        this.spinner.hide();

        if (!res?.success) {
          this.toastr.warning(
            getFirstApiErrorMessage(
              res,
              'Unable to load latest loan journey. Redirecting to loan home.',
            ),
          );
          this.router.navigate(['/dashboard/loan'], { replaceUrl: true });
          return;
        }

        const nextRoute = this.resolvePostEkycRoute(res.data);
        this.router.navigateByUrl(nextRoute, { replaceUrl: true });
      },
      error: (err) => {
        this.isResolvingNextStep = false;
        this.spinner.hide();
        this.toastr.warning(
          getFirstApiErrorMessage(
            err,
            'Unable to load latest loan journey. Redirecting to loan home.',
          ),
        );
        this.router.navigate(['/dashboard/loan'], { replaceUrl: true });
      }
    });
  }

  onSuccessCancel() {
    this.router.navigate(['/dashboard/loan']);
  }

  private resolvePostEkycRoute(snapshot: any): string {
    const nextActionRoute = this.resolveNextActionRoute(
      snapshot?.applicationFlow?.nextAction,
    );

    if (nextActionRoute) {
      return nextActionRoute;
    }

    const flowSteps = snapshot?.applicationFlow?.steps || {};
    const nextPendingStep = this.postEkycStepRoutes.find(
      ({ step }) => flowSteps?.[step] !== true,
    );

    return nextPendingStep?.route || '/dashboard/loan';
  }

  private resolveNextActionRoute(nextAction: any): string | null {
    const directRoute = this.normalizeInternalLoanRoute(
      nextAction?.url ||
        nextAction?.route ||
        nextAction?.path ||
        nextAction?.redirectUrl,
    );

    if (directRoute) {
      return directRoute;
    }

    const actionCode = this.normalizeActionToken(
      this.resolveNextActionCode(nextAction),
    );

    return actionCode ? this.nextActionRouteMap[actionCode] || null : null;
  }

  private resolveNextActionCode(nextAction: any): string {
    if (typeof nextAction === 'string') {
      return nextAction;
    }

    return (
      nextAction?.code ||
      nextAction?.name ||
      nextAction?.action ||
      nextAction?.type ||
      ''
    );
  }

  private normalizeActionToken(value: any): string {
    return String(value ?? '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private normalizeInternalLoanRoute(candidate: any): string | null {
    const rawRoute = String(candidate ?? '').trim();
    if (!rawRoute) {
      return null;
    }

    const baseOrigin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'http://localhost';

    let routePath = rawRoute;

    try {
      const parsedUrl = new URL(rawRoute, baseOrigin);
      routePath = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    } catch {
      routePath = rawRoute;
    }

    const normalizedRoute = routePath.startsWith('/')
      ? routePath
      : `/${routePath.replace(/^\/+/, '')}`;

    if (!this.allowedPostEkycRoutes.has(normalizedRoute)) {
      return null;
    }

    return normalizedRoute;
  }
}
