import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { ContentService } from '../../../service/content.service';
import { getFirstApiErrorMessage } from '../../../service/api-error.util';

type AmountOption = 'MINIMUM' | 'FULL' | 'CUSTOM' | 'FORECLOSURE';

@Component({
  selector: 'app-loan-repay',
  templateUrl: './loan-repay.component.html',
  styleUrls: ['./loan-repay.component.css']
})
export class LoanRepayComponent implements OnInit {
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

  get payableAmount(): number {
    return this.toNumber(this.summary?.payableAmount);
  }

  get regularPayableAmount(): number {
    return this.toNumber(this.summary?.regularPayableAmount || this.summary?.payableAmount);
  }

  get nextDueAmount(): number {
    return this.toNumber(this.summary?.nextDueAmount);
  }

  get overdueAmount(): number {
    return this.toNumber(this.summary?.overdueAmount);
  }

  get minPayAmount(): number {
    return this.toNumber(this.summary?.minPayAmount);
  }

  get maxPayAmount(): number {
    return this.toNumber(this.summary?.maxPayAmount);
  }

  get selectedAmount(): number {
    if (this.amountOption === 'FULL') {
      return this.regularPayableAmount;
    }

    if (this.amountOption === 'FORECLOSURE') {
      return this.payableAmount;
    }

    if (this.amountOption === 'MINIMUM') {
      return this.minPayAmount;
    }

    return this.toNumber(this.customAmount);
  }

  get paymentType(): 'FULL' | 'PARTIAL' {
    return this.amountOption === 'FULL' || this.amountOption === 'FORECLOSURE'
      ? 'FULL'
      : 'PARTIAL';
  }

  get hasForeclosureQuote(): boolean {
    return !!this.summary?.foreclosureEligible;
  }

  get foreclosureSavings(): number {
    return this.toNumber(this.summary?.foreclosureWaivedAmount);
  }

  get foreclosureInterestAccrued(): number {
    return this.toNumber(this.summary?.foreclosureInterestAccrued);
  }

  get amountHeadlineLabel(): string {
    return 'Precolsure Payable';
  }

  get amountHeadlineHint(): string {
    if (this.maxPayAmount <= 0) {
      return 'No payment is due for this loan right now.';
    }

    if (this.hasForeclosureQuote) {
      return `Close early and save ${this.formatCurrency(this.foreclosureSavings)} on future charges.`;
    }

    return '';
  }

  get isFullDueEnabled(): boolean {
    const maturityDate = this.summary?.foreclosureMaturityDate || this.summary?.nextDueDate;

    if (!maturityDate) {
      return true;
    }

    const maturityDateValue = this.toDateValue(maturityDate);
    const todayValue = this.toDateValue(new Date());

    if (maturityDateValue === null || todayValue === null) {
      return true;
    }

    return todayValue >= maturityDateValue;
  }

  get quickAmounts(): number[] {
    const summaryAmounts = Array.isArray(this.summary?.suggestedAmounts)
      ? this.summary.suggestedAmounts
      : [];

    const normalized = summaryAmounts
      .map((amount: any) => this.toNumber(amount))
      .filter((amount: number) => amount > 0)
      .filter((amount: number) => this.maxPayAmount <= 0 || amount <= this.maxPayAmount)
      .filter((amount: number) => this.minPayAmount <= 0 || amount >= this.minPayAmount);

    const deduped = Array.from(new Set<number>(normalized));

    if (this.maxPayAmount > 0 && !deduped.includes(this.maxPayAmount)) {
      deduped.push(this.maxPayAmount);
    }

    return deduped.slice(0, 5);
  }

  get canPay(): boolean {
    return this.maxPayAmount > 0 &&
      !this.creatingOrder &&
      !this.refreshingStatus &&
      !(this.amountOption === 'FULL' && !this.isFullDueEnabled);
  }

  get amountError(): string {
    if (this.amountOption !== 'CUSTOM') {
      return '';
    }

    if (this.customAmount === null || this.customAmount === undefined || this.customAmount === 0) {
      return 'Enter an amount to continue.';
    }

    if (this.selectedAmount < this.minPayAmount) {
      return `Amount cannot be below ${this.formatCurrency(this.minPayAmount)}.`;
    }

    if (this.selectedAmount > this.maxPayAmount) {
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
        this.summary = this.normalizeSummary(raw);

        if (this.maxPayAmount <= 0) {
          this.amountOption = 'FULL';
          this.customAmount = null;
          return;
        }

        if (this.hasForeclosureQuote && this.payableAmount > 0) {
          this.amountOption = 'FORECLOSURE';
        } else if (this.regularPayableAmount > 0 && this.isFullDueEnabled) {
          this.amountOption = 'FULL';
        } else if (this.minPayAmount > 0) {
          this.amountOption = 'MINIMUM';
        } else {
          this.amountOption = 'CUSTOM';
        }
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
    if (option === 'FULL' && !this.isFullDueEnabled) {
      return;
    }

    this.amountOption = option;

    if (option !== 'CUSTOM') {
      this.customAmount = null;
    }
  }

  applyQuickAmount(amount: number): void {
    if (this.hasForeclosureQuote && amount === this.payableAmount) {
      this.amountOption = 'FORECLOSURE';
      this.customAmount = null;
      return;
    }

    if (amount === this.regularPayableAmount && !this.isFullDueEnabled) {
      this.amountOption = 'CUSTOM';
      this.customAmount = amount;
      return;
    }

    this.amountOption = amount === this.regularPayableAmount ? 'FULL' : 'CUSTOM';
    this.customAmount = amount === this.regularPayableAmount ? null : amount;
  }

  createPayment(): void {
    if (!this.canPay) {
      return;
    }

    if (this.paymentType === 'PARTIAL' && this.amountError) {
      this.toastr.warning(this.amountError);
      return;
    }

    const payload = {
      applicationId: this.applicationId,
      amount: this.selectedAmount,
      paymentType: this.paymentType,
      returnUrl: `https://staging.d1ndeezlom7hf1.amplifyapp.com/dashboard/profile/loan-repay/${this.applicationId}`,
      orderNote: `Repayment for ${this.applicationNumber}`
    };

    this.creatingOrder = true;
    this.contentService.createBorrowerRepaymentOrder(payload).subscribe({
      next: (res: any) => {
        this.creatingOrder = false;

        if (res?.success === false) {
          this.toastr.error(getFirstApiErrorMessage(res, 'Unable to create payment order'));
          return;
        }

        const data = res?.data || res;
        const orderId = data?.cashfreeOrderId || data?.orderId || data?.paymentGatewayOrder?.orderId || '';
        const hostedPaymentUrl =
          data?.cashfree?.hostedPaymentUrl ||
          data?.paymentGatewayOrder?.hostedPaymentUrl ||
          data?.hostedPaymentUrl ||
          '';

        if (orderId) {
          sessionStorage.setItem(`repay-order:${this.applicationId}`, orderId);
        }

        if (hostedPaymentUrl) {
          window.location.assign(hostedPaymentUrl);
          return;
        }

        const paymentLinkMessage = getFirstApiErrorMessage(res);
        if (paymentLinkMessage) {
          this.toastr.error(paymentLinkMessage);
        }
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
      sessionStorage.getItem(`repay-order:${this.applicationId}`) ||
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
          data?.repaymentSummary || data?.repayment || data?.summary || data
        );
        this.paymentResult = data?.payment || data?.paymentResult || null;
        this.orderStatus = data?.paymentGatewayOrder || data?.orderStatus || null;

        if (this.orderStatus?.paidAt || this.orderStatus?.paymentStatus === 'SUCCESS') {
          this.toastr.success('Payment status updated successfully');
        } else if (this.orderStatus?.paymentStatus === 'FAILED') {
          const paymentFailureMessage =
            getFirstApiErrorMessage(this.orderStatus) ||
            getFirstApiErrorMessage(data);

          if (paymentFailureMessage) {
            this.toastr.error(paymentFailureMessage);
          }
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
this.router.navigateByUrl('/dashboard')  }

  private clearCallbackParams(): void {
    if (!this.callbackOrderId || !this.applicationId) {
      return;
    }

    this.callbackOrderId = '';
    this.router.navigate(['/dashboard/profile/loan-repay', this.applicationId], {
      replaceUrl: true
    });
  }

  private normalizeSummary(raw: any): any {
    const borrower = raw?.borrower || {};
    const application = raw?.application || {};
    const dues = raw?.dues || {};
    const summary = raw?.summary || {};
    const loan = raw?.loan || {};
    const paymentOptions = raw?.paymentOptions || {};
    const foreclosureQuote = dues?.foreclosureQuote || raw?.foreclosureQuote || {};
    const foreclosurePayableAmount = foreclosureQuote?.eligible
      ? this.toNumber(foreclosureQuote?.payableAmount)
      : 0;
    const regularPayableAmount = this.toNumber(
      foreclosureQuote?.regularPayableAmount ??
      raw?.regularPayableAmount ??
      dues?.regularPayableAmount ??
      dues?.payableAmount ??
      summary?.payableAmount ??
      raw?.payableAmount ??
      0
    );
    const summaryPayableAmount = foreclosurePayableAmount > 0
      ? foreclosurePayableAmount
      : regularPayableAmount;

    return {
      borrowerName:
        raw?.borrowerName ||
        borrower?.name ||
        borrower?.fullName ||
        [borrower?.firstName, borrower?.lastName].filter(Boolean).join(' ') ||
        '--',
      applicationNumber:
        raw?.applicationNumber ||
        application?.applicationNumber ||
        summary?.applicationNumber ||
        '--',
      loanStatus:
        raw?.loanStatus ||
        raw?.status ||
        loan?.status ||
        application?.status ||
        application?.applicationStatus ||
        summary?.applicationStatus ||
        '--',
      payableAmount:
        summaryPayableAmount,
      regularPayableAmount,
      nextDueAmount:
        raw?.nextDueAmount ??
        summary?.nextDueAmount ??
        dues?.nextDue?.dueAmount ??
        dues?.nextDueAmount ??
        0,
      nextDueDate:
        raw?.nextDueDate ||
        dues?.nextDue?.dueDate ||
        dues?.nextDueDate ||
        summary?.nextDueDate ||
        null,
      overdueAmount:
        raw?.overdueAmount ??
        dues?.overdueAmount ??
        summary?.overdueAmount ??
        0,
      minPayAmount:
        raw?.minPayAmount ??
        raw?.minPayableAmount ??
        paymentOptions?.minPayAmount ??
        dues?.minPayAmount ??
        dues?.minimumDueAmount ??
        summary?.minPayAmount ??
        0,
      maxPayAmount:
        raw?.maxPayAmount ??
        raw?.maxPayableAmount ??
        paymentOptions?.maxPayAmount ??
        dues?.maxPayAmount ??
        regularPayableAmount ??
        dues?.payableAmount ??
        summary?.maxPayAmount ??
        0,
      suggestedAmounts:
        raw?.suggestedAmounts ||
        paymentOptions?.suggestedAmounts ||
        dues?.suggestedAmounts ||
        summary?.suggestedAmounts ||
        [],
      foreclosureEligible: !!foreclosureQuote?.eligible,
      foreclosureReason: foreclosureQuote?.reason || null,
      foreclosureAsOfDate: foreclosureQuote?.asOfDate || null,
      foreclosureMaturityDate: foreclosureQuote?.maturityDate || null,
      foreclosureElapsedDays: this.toNumber(foreclosureQuote?.elapsedDays),
      foreclosureTotalDays: this.toNumber(foreclosureQuote?.totalDays),
      foreclosureInterestAccrued: foreclosureQuote?.interestAccruedTillDate ?? 0,
      foreclosureWaivedAmount:
        foreclosureQuote?.waivedAmount ??
        foreclosureQuote?.interestWaived ??
        0,
      allowPartialPayment: paymentOptions?.allowPartialPayment !== false,
      allowFullPayment: paymentOptions?.allowFullPayment !== false
    };
  }

  private toNumber(value: any): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toDateOnly(value: string | Date): string {
    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const year = date.getUTCFullYear();
    const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
    const day = `${date.getUTCDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private toDateValue(value: string | Date): number | null {
    const normalized = this.toDateOnly(value);

    if (!normalized) {
      return null;
    }

    return Number(normalized.replace(/-/g, ''));
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(this.toNumber(value));
  }
}
