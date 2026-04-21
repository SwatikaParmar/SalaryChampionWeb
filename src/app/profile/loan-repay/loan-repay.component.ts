import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';

import { ContentService } from '../../../service/content.service';
import { getFirstApiErrorMessage } from '../../../service/api-error.util';
import { formatDateForDisplay } from '../../shared/date-format.util';

type AmountOption = 'MINIMUM' | 'FULL' | 'CUSTOM';
type RepaymentPaymentType = 'PARTIAL' | 'FULL';

@Component({
  selector: 'app-loan-repay',
  templateUrl: './loan-repay.component.html',
  styleUrls: ['./loan-repay.component.css']
})
export class LoanRepayComponent implements OnInit {
  private readonly repaymentOrderStoragePrefix = 'repay-order:';
  private readonly repaymentOptionStoragePrefix = 'repay-option:';

  applicationId = '';
  summary: any = null;
  refreshResult: any = null;
  paymentResult: any = null;
  orderStatus: any = null;
  private callbackOrderId = '';

  amountOption: AmountOption = 'FULL';
  customAmount: number | null = null;

  loadingSummary = false;
  creatingOrder = false;
  refreshingStatus = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private contentService: ContentService,
    private toastr: ToastrService,
    private spinner: NgxSpinnerService
  ) {}

  ngOnInit(): void {
    this.applicationId =
      this.route.snapshot.paramMap.get('id') ||
      this.route.snapshot.queryParamMap.get('applicationId') ||
      '';

    if (!this.applicationId) {
      this.toastr.error('Application not found');
      this.router.navigate(['/dashboard/profile/loan-history']);
      return;
    }

    this.route.queryParams.subscribe((params) => {
      this.fetchSummary();

      const orderId = params['orderId'] || params['cf_order_id'] || params['order_id'] || '';
      if (orderId) {
        this.callbackOrderId = orderId;
        this.refreshPaymentStatus(orderId);
      } else {
        this.callbackOrderId = '';
        this.refreshResult = null;
        this.paymentResult = null;
        this.orderStatus = null;
      }
    });
  }

  get borrowerName(): string {
    return this.summary?.borrowerName || '--';
  }

  get applicationNumber(): string {
    return this.summary?.applicationNumber || '--';
  }

  get loanStatus(): string {
    return this.summary?.loanStatus || '--';
  }

  get dueDateDisplay(): string {
    return this.summary?.dueDateDisplay || '--';
  }

  get delayDays(): number {
    return this.toNumber(this.summary?.delayDays);
  }

  get payableNow(): number {
    return this.toNumber(this.summary?.payableNow);
  }

  get scheduledDue(): number {
    return this.toNumber(this.summary?.scheduledDue);
  }

  get penaltyAmount(): number {
    return this.toNumber(this.summary?.penaltyAmount);
  }

  get totalPaid(): number {
    return this.toNumber(this.summary?.totalPaid);
  }

  get allowPartialPayment(): boolean {
    return !!this.summary?.paymentOptions?.allowPartialPayment;
  }

  get allowFullPayment(): boolean {
    return !!this.summary?.paymentOptions?.allowFullPayment;
  }

  get minPayAmount(): number {
    return this.toNumber(this.summary?.paymentOptions?.minPayAmount);
  }

  get maxPayAmount(): number {
    return this.toNumber(this.summary?.paymentOptions?.maxPayAmount);
  }

  get suggestedAmounts(): number[] {
    const rawSuggestedAmounts = Array.isArray(this.summary?.paymentOptions?.suggestedAmounts)
      ? this.summary.paymentOptions.suggestedAmounts
      : [];

    return Array.from(
      new Set(
        rawSuggestedAmounts
          .map((amount: any) => this.toNumber(amount))
          .filter((amount: number) => amount > 0)
          .filter((amount: number) => this.maxPayAmount <= 0 || amount <= this.maxPayAmount)
          .filter((amount: number) => this.minPayAmount <= 0 || amount >= this.minPayAmount)
      )
    );
  }

  get canShowMinimumOption(): boolean {
    return this.allowPartialPayment && this.scheduledDue > 0;
  }

  get canShowFullOption(): boolean {
    return this.allowFullPayment && this.payableNow > 0;
  }

  get canShowCustomOption(): boolean {
    return this.allowPartialPayment && this.maxPayAmount > 0;
  }

  get selectedAmount(): number {
    if (this.amountOption === 'FULL') {
      return this.payableNow;
    }

    if (this.amountOption === 'MINIMUM') {
      return this.scheduledDue;
    }

    return this.toNumber(this.customAmount);
  }

  get selectedAmountLabel(): string {
    switch (this.amountOption) {
      case 'MINIMUM':
        return 'Minimum Due';
      case 'CUSTOM':
        return 'Custom Amount';
      default:
        return 'Full Payable';
    }
  }

  get canPay(): boolean {
    return !!this.summary &&
      this.selectedAmount > 0 &&
      !this.creatingOrder &&
      !this.refreshingStatus &&
      !this.loadingSummary &&
      !this.amountError;
  }

  get amountError(): string {
    if (this.amountOption !== 'CUSTOM') {
      return '';
    }

    if (this.customAmount === null || this.customAmount === undefined || this.customAmount === 0) {
      return 'Enter an amount to continue.';
    }

    if (this.minPayAmount > 0 && this.selectedAmount < this.minPayAmount) {
      return `Amount cannot be below ${this.formatCurrency(this.minPayAmount)}.`;
    }

    if (this.maxPayAmount > 0 && this.selectedAmount > this.maxPayAmount) {
      return `Amount cannot exceed ${this.formatCurrency(this.maxPayAmount)}.`;
    }

    return '';
  }

  fetchSummary(): void {
    this.loadingSummary = true;
    this.spinner.show();

    this.contentService.getBorrowerRepaymentSummary(this.applicationId).subscribe({
      next: (res: any) => {
        this.spinner.hide();
        this.loadingSummary = false;

        if (res?.success === false) {
          this.summary = null;
          this.toastr.error(getFirstApiErrorMessage(res, 'Failed to load repayment summary'));
          return;
        }

        const raw = res?.data || res;
        this.summary = this.normalizeSummary(raw, this.summary);
        this.syncAmountOptionState();
      },
      error: (err) => {
        this.spinner.hide();
        this.loadingSummary = false;
        this.summary = null;
        this.toastr.error(getFirstApiErrorMessage(err, 'Failed to load repayment summary'));
      }
    });
  }

  selectAmountOption(option: AmountOption): void {
    if (
      (option === 'FULL' && !this.canShowFullOption) ||
      (option === 'MINIMUM' && !this.canShowMinimumOption) ||
      (option === 'CUSTOM' && !this.canShowCustomOption)
    ) {
      return;
    }

    this.amountOption = option;

    if (option === 'CUSTOM') {
      if (!this.customAmount) {
        this.customAmount = this.minPayAmount > 0 ? this.minPayAmount : this.maxPayAmount;
      }
      return;
    }

    this.customAmount = null;
  }

  applySuggestedAmount(amount: number): void {
    if (this.canShowFullOption && amount === this.payableNow) {
      this.selectAmountOption('FULL');
      return;
    }

    if (this.canShowMinimumOption && amount === this.scheduledDue) {
      this.selectAmountOption('MINIMUM');
      return;
    }

    if (!this.canShowCustomOption) {
      return;
    }

    this.amountOption = 'CUSTOM';
    this.customAmount = amount;
  }

  createPayment(): void {
    if (!this.canPay) {
      return;
    }

    if (this.amountError) {
      this.toastr.warning(this.amountError);
      return;
    }

    const payload = {
      applicationId: this.summary?.applicationId || this.applicationId,
      amount: this.gatewayAmount,
      paymentType: this.gatewayPaymentType,
      returnUrl: this.buildPaymentReturnUrl(),
      orderNote: 'Loan repayment'
    };
    const createOrderEndpoint = this.summary?.createOrderEndpoint;
    const request$ = createOrderEndpoint
      ? this.contentService.postToEndpoint(createOrderEndpoint, payload)
      : this.contentService.createBorrowerRepaymentOrder(payload);

    this.creatingOrder = true;

    request$.subscribe({
      next: (res: any) => {
        this.creatingOrder = false;

        if (res?.success === false) {
          this.toastr.error(getFirstApiErrorMessage(res, 'Unable to create payment order'));
          return;
        }

        const data = res?.data || res;
        const orderId =
          data?.cashfreeOrderId ||
          data?.orderId ||
          data?.paymentGatewayOrder?.orderId ||
          '';
        const hostedPaymentUrl =
          data?.cashfree?.hostedPaymentUrl ||
          data?.paymentGatewayOrder?.hostedPaymentUrl ||
          data?.hostedPaymentUrl ||
          data?.redirectUrl ||
          '';

        if (orderId) {
          this.setSessionValue(this.repaymentOrderStorageKey, orderId);
          this.setSessionValue(this.repaymentOptionStorageKey, this.amountOption);
        }

        if (hostedPaymentUrl) {
          window.location.assign(hostedPaymentUrl);
          return;
        }

        const paymentLinkMessage = getFirstApiErrorMessage(res, 'Payment link is unavailable right now');
        this.toastr.error(paymentLinkMessage);
      },
      error: (err) => {
        this.creatingOrder = false;
        this.toastr.error(getFirstApiErrorMessage(err, 'Unable to create payment order'));
      }
    });
  }

  refreshPaymentStatus(orderId?: string): void {
    const resolvedOrderId =
      orderId ||
      this.getSessionValue(this.repaymentOrderStorageKey) ||
      '';

    if (!resolvedOrderId) {
      return;
    }

    this.refreshingStatus = true;

    this.contentService.refreshBorrowerRepayment({
      applicationId: this.applicationId,
      orderId: resolvedOrderId
    }).subscribe({
      next: (res: any) => {
        this.refreshingStatus = false;

        if (res?.success === false) {
          this.clearCallbackParams();
          this.toastr.error(getFirstApiErrorMessage(res, 'Failed to refresh payment status'));
          return;
        }

        const data = res?.data || res;
        this.refreshResult = this.normalizeSummary(
          data?.repaymentSummary || data?.repayment || data?.summary || data,
          this.summary
        );
        this.paymentResult = data?.payment || data?.paymentResult || null;
        this.orderStatus = data?.paymentGatewayOrder || data?.orderStatus || null;

        const savedRepaymentOption = this.getSessionValue(this.repaymentOptionStorageKey);
        const shouldRedirectToDashboard =
          this.isSuccessfulPayment(this.orderStatus) &&
          savedRepaymentOption === 'FULL';

        if (this.isSuccessfulPayment(this.orderStatus)) {
          this.toastr.success('Payment status updated successfully');
        } else if (this.orderStatus?.paymentStatus === 'FAILED') {
          const paymentFailureMessage =
            getFirstApiErrorMessage(this.orderStatus) ||
            getFirstApiErrorMessage(data);

          if (paymentFailureMessage) {
            this.toastr.error(paymentFailureMessage);
          }
        }

        if (shouldRedirectToDashboard) {
          this.clearRepaymentStorage();
          this.navigateToDashboardWithRefresh(true);
          return;
        }

        this.clearCallbackParams();
        this.fetchSummary();
      },
      error: (err) => {
        this.refreshingStatus = false;
        this.clearCallbackParams();
        this.toastr.error(getFirstApiErrorMessage(err, 'Failed to refresh payment status'));
      }
    });
  }

  goBack(): void {
    this.navigateToDashboardWithRefresh();
  }

  private get repaymentOrderStorageKey(): string {
    return `${this.repaymentOrderStoragePrefix}${this.applicationId}`;
  }

  private get repaymentOptionStorageKey(): string {
    return `${this.repaymentOptionStoragePrefix}${this.applicationId}`;
  }

  private clearCallbackParams(): void {
    if (!this.callbackOrderId || !this.applicationId) {
      return;
    }

    this.callbackOrderId = '';
    this.router.navigate(['/dashboard/profile/loan-repay', this.applicationId], {
      replaceUrl: true
    });
  }

  private isSuccessfulPayment(orderStatus: any): boolean {
    return !!(orderStatus?.paidAt || orderStatus?.paymentStatus === 'SUCCESS');
  }

  private navigateToDashboardWithRefresh(shouldSyncRepaymentState = false): void {
    const dashboardPath = shouldSyncRepaymentState
      ? '/dashboard?refresh=true'
      : '/dashboard';
    const dashboardUrl = this.buildAbsoluteUrl(dashboardPath);

    if (typeof window !== 'undefined') {
      window.location.replace(dashboardUrl);
      return;
    }

    this.router.navigateByUrl('/dashboard', { replaceUrl: true });
  }

  private buildAbsoluteUrl(path: string): string {
    const origin =
      typeof window !== 'undefined' && typeof window.location?.origin === 'string'
        ? window.location.origin
        : '';

    return origin ? `${origin}${path}` : path;
  }

  private get gatewayAmount(): number {
    return this.selectedAmount;
  }

  private get gatewayPaymentType(): RepaymentPaymentType {
    return this.amountOption === 'FULL' ? 'FULL' : 'PARTIAL';
  }

  private buildPaymentReturnUrl(): string {
    return this.amountOption === 'FULL'
      ? this.buildAbsoluteUrl('/dashboard?refresh=true')
      : this.buildRepaymentReturnUrl();
  }

  private buildRepaymentReturnUrl(): string {
    const targetApplicationId = encodeURIComponent(this.summary?.applicationId || this.applicationId);
    return this.buildAbsoluteUrl(`/dashboard/profile/loan-repay/${targetApplicationId}`);
  }

  private clearRepaymentStorage(): void {
    this.removeSessionValue(this.repaymentOrderStorageKey);
    this.removeSessionValue(this.repaymentOptionStorageKey);
  }

  private getSessionValue(key: string): string {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return '';
    }

    return sessionStorage.getItem(key)?.trim() || '';
  }

  private setSessionValue(key: string, value: string): void {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined' || !value) {
      return;
    }

    sessionStorage.setItem(key, value);
  }

  private removeSessionValue(key: string): void {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return;
    }

    sessionStorage.removeItem(key);
  }

  private normalizeSummary(raw: any, fallback?: any): any {
    const base = fallback || {};
    const borrower = raw?.borrower || {};
    const application = raw?.application || {};
    const loan = raw?.loan || {};
    const summary = raw?.summary || raw;
    const paymentOptions = raw?.paymentOptions || {};
    const dueDateRaw = this.pickFirstString(
      summary?.nextDueDate,
      raw?.nextDueDate,
      base?.dueDateRaw
    );
    const fallbackPaymentOptions = base?.paymentOptions || {};
    const suggestedAmountsSource = Array.isArray(paymentOptions?.suggestedAmounts)
      ? paymentOptions.suggestedAmounts
      : Array.isArray(fallbackPaymentOptions?.suggestedAmounts)
        ? fallbackPaymentOptions.suggestedAmounts
        : [];

    return {
      applicationId: this.pickFirstString(
        application?.applicationId,
        raw?.applicationId,
        base?.applicationId,
        this.applicationId
      ),
      borrowerName: this.pickFirstString(
        borrower?.name,
        raw?.borrowerName,
        base?.borrowerName,
        '--'
      ),
      applicationNumber: this.pickFirstString(
        application?.applicationNumber,
        raw?.applicationNumber,
        base?.applicationNumber,
        '--'
      ),
      loanStatus: this.pickFirstString(
        loan?.status,
        raw?.loanStatus,
        base?.loanStatus,
        '--'
      ),
      dueDateRaw,
      dueDateDisplay: this.formatDisplayDate(dueDateRaw),
      delayDays: this.toNumber(summary?.dpd ?? raw?.dpd ?? base?.delayDays),
      payableNow: this.toNumber(summary?.finalDueAmount ?? raw?.finalDueAmount ?? base?.payableNow),
      scheduledDue: this.toNumber(summary?.nextDueAmount ?? raw?.nextDueAmount ?? base?.scheduledDue),
      penaltyAmount: this.toNumber(summary?.penaltyAmount ?? raw?.penaltyAmount ?? base?.penaltyAmount),
      totalPaid: this.toNumber(summary?.totalPaid ?? raw?.totalPaid ?? base?.totalPaid),
      paymentOptions: {
        allowPartialPayment:
          paymentOptions?.allowPartialPayment !== undefined
            ? !!paymentOptions.allowPartialPayment
            : fallbackPaymentOptions?.allowPartialPayment !== undefined
              ? !!fallbackPaymentOptions.allowPartialPayment
              : true,
        allowFullPayment:
          paymentOptions?.allowFullPayment !== undefined
            ? !!paymentOptions.allowFullPayment
            : fallbackPaymentOptions?.allowFullPayment !== undefined
              ? !!fallbackPaymentOptions.allowFullPayment
              : true,
        minPayAmount: this.toNumber(
          paymentOptions?.minPayAmount ??
          fallbackPaymentOptions?.minPayAmount
        ),
        maxPayAmount: this.toNumber(
          paymentOptions?.maxPayAmount ??
          fallbackPaymentOptions?.maxPayAmount ??
          summary?.finalDueAmount ??
          raw?.finalDueAmount
        ),
        suggestedAmounts: suggestedAmountsSource
      },
      createOrderEndpoint: this.pickFirstString(
        raw?.actions?.createOrderEndpoint,
        base?.createOrderEndpoint
      )
    };
  }

  private syncAmountOptionState(): void {
    if (this.canShowFullOption && this.amountOption === 'FULL') {
      this.customAmount = null;
      return;
    }

    if (this.canShowMinimumOption && this.amountOption === 'MINIMUM') {
      this.customAmount = null;
      return;
    }

    if (this.canShowCustomOption && this.amountOption === 'CUSTOM') {
      if (!this.customAmount || this.customAmount < this.minPayAmount) {
        this.customAmount = this.minPayAmount > 0 ? this.minPayAmount : this.maxPayAmount;
      }
      return;
    }

    if (this.canShowFullOption) {
      this.amountOption = 'FULL';
      this.customAmount = null;
      return;
    }

    if (this.canShowMinimumOption) {
      this.amountOption = 'MINIMUM';
      this.customAmount = null;
      return;
    }

    this.amountOption = 'CUSTOM';
    this.customAmount = this.minPayAmount > 0 ? this.minPayAmount : this.maxPayAmount;
  }

  private pickFirstString(...candidates: any[]): string {
    for (const candidate of candidates) {
      if (typeof candidate !== 'string') {
        continue;
      }

      const trimmed = candidate.trim();
      if (trimmed) {
        return trimmed;
      }
    }

    return '';
  }

  private formatDisplayDate(value: any): string {
    const rawValue = this.pickFirstString(value);

    if (!rawValue) {
      return '--';
    }

    return formatDateForDisplay(rawValue) || rawValue;
  }

  private toNumber(value: any): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(this.toNumber(value));
  }
}
