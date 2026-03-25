import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { ContentService } from '../../../service/content.service';

type AmountOption = 'MINIMUM' | 'FULL' | 'CUSTOM';

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
      return this.payableAmount;
    }

    if (this.amountOption === 'MINIMUM') {
      return this.minPayAmount;
    }

    return this.toNumber(this.customAmount);
  }

  get paymentType(): 'FULL' | 'PARTIAL' {
    return this.amountOption === 'FULL' ? 'FULL' : 'PARTIAL';
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
    return this.maxPayAmount > 0 && !this.creatingOrder && !this.refreshingStatus;
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

        const raw = res?.data || res;
        this.summary = this.normalizeSummary(raw);

        if (this.maxPayAmount <= 0) {
          this.amountOption = 'FULL';
          this.customAmount = null;
          return;
        }

        if (this.payableAmount > 0) {
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
        this.toastr.error(err?.error?.message || 'Failed to load repayment summary');
      }
    });
  }

  selectAmountOption(option: AmountOption): void {
    this.amountOption = option;

    if (option !== 'CUSTOM') {
      this.customAmount = null;
    }
  }

  applyQuickAmount(amount: number): void {
    this.amountOption = amount === this.maxPayAmount ? 'FULL' : 'CUSTOM';
    this.customAmount = amount === this.maxPayAmount ? null : amount;
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
      amount: this.paymentType === 'FULL' ? this.payableAmount : this.selectedAmount,
      paymentType: this.paymentType,
      returnUrl: `https://staging.d3vz8sn6l3j2ck.amplifyapp.com/dashboard/profile/loan-repay/${this.applicationId}`,
      orderNote: `Repayment for ${this.applicationNumber}`
    };

    this.creatingOrder = true;

    this.contentService.createBorrowerRepaymentOrder(payload).subscribe({
      next: (res: any) => {
        this.creatingOrder = false;

        const data = res?.data || res;
        const orderId = data?.cashfreeOrderId || data?.orderId || data?.paymentGatewayOrder?.orderId || '';
        const paymentUrl =
          data?.paymentLinkUrl ||
          data?.paymentLink ||
          data?.hostedPaymentUrl ||
          data?.cashfree?.paymentLinkUrl ||
          data?.cashfree?.hostedPaymentUrl ||
          '';

        if (orderId) {
          sessionStorage.setItem(`repay-order:${this.applicationId}`, orderId);
        }

        if (paymentUrl) {
          window.location.href = paymentUrl;
          return;
        }

        this.toastr.error('Payment session created, but payment URL is missing.');
      },
      error: (err) => {
        this.creatingOrder = false;
        this.toastr.error(err?.error?.message || 'Unable to create payment order');
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

        const data = res?.data || res;
        this.refreshResult = this.normalizeSummary(
          data?.repaymentSummary || data?.repayment || data?.summary || data
        );
        this.paymentResult = data?.payment || data?.paymentResult || null;
        this.orderStatus = data?.paymentGatewayOrder || data?.orderStatus || null;

        if (this.orderStatus?.paidAt || this.orderStatus?.paymentStatus === 'SUCCESS') {
          this.toastr.success('Payment status updated successfully');
        } else if (this.orderStatus?.paymentStatus === 'FAILED') {
          this.toastr.error('Payment failed. You can retry from this page.');
        }

        this.clearCallbackParams();
        this.fetchSummary();
      },
      error: (err) => {
        this.refreshingStatus = false;
        this.clearCallbackParams();
        this.toastr.error(err?.error?.message || 'Failed to refresh payment status');
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
        application?.status ||
        application?.applicationStatus ||
        summary?.applicationStatus ||
        '--',
      payableAmount:
        raw?.payableAmount ??
        dues?.payableAmount ??
        summary?.payableAmount ??
        0,
      nextDueAmount:
        raw?.nextDueAmount ??
        dues?.nextDueAmount ??
        summary?.nextDueAmount ??
        0,
      nextDueDate:
        raw?.nextDueDate ||
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
        dues?.minPayAmount ??
        dues?.minimumDueAmount ??
        summary?.minPayAmount ??
        0,
      maxPayAmount:
        raw?.maxPayAmount ??
        raw?.maxPayableAmount ??
        dues?.maxPayAmount ??
        dues?.payableAmount ??
        summary?.maxPayAmount ??
        0,
      suggestedAmounts:
        raw?.suggestedAmounts ||
        dues?.suggestedAmounts ||
        summary?.suggestedAmounts ||
        []
    };
  }

  private toNumber(value: any): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(this.toNumber(value));
  }
}
