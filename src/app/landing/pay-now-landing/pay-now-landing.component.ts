import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ContentService } from '../../../service/content.service';
import { getFirstApiErrorMessage } from '../../../service/api-error.util';

declare var bootstrap: any;

const DEFAULT_MANUAL_PAYMENT_THRESHOLD = 100000;

const FALLBACK_MANUAL_PAYMENT_DETAILS = {
  beneficiaryName: 'Richman Fincap Limited',
  accountNumber: '19711399676',
  ifscCode: 'IDFB0020194',
  upiId: 'richmanfincap@idfcbank',
  note:
    'Please mention your loan reference number or registered mobile number in the payment description for proper allocation.',
  warning:
    'Always verify these payment details by calling our customer support before making large transactions. Never share these details with anyone claiming to be from our company.'
};

type PaymentType = 'FULL' | 'PARTIAL';

@Component({
  selector: 'app-pay-now-landing',
  templateUrl: './pay-now-landing.component.html',
  styleUrl: './pay-now-landing.component.css'
})
export class PayNowLandingComponent implements OnInit, AfterViewInit, OnDestroy {
  panValue = '';
  modalInstance: any;
  manualPaymentModal: any;

  otpTxnId = '';
  applicationId = '';
  applicationNumber = '';
  destinationMobile = '';
  showOtpScreen = false;
  otpCode = '';

  paymentStatus: any = null;
  resultModal: any;
  pollInterval: any;
  paymentDetails: any;
  repaymentInfo: any;

  borrower: any;
  application: any;
  loan: any;
  summary: any;
  dues: any;

  paymentType: PaymentType = 'FULL';
  amount = 0;

  repayToken = '';
  orderId = '';
  hostedPaymentUrl = '';

  showPaymentSection = false;
  showScannerFallbackCard = false;
  manualPaymentThreshold = DEFAULT_MANUAL_PAYMENT_THRESHOLD;
  manualPaymentRequired = false;
  manualPaymentCtaAcknowledged = false;
  manualPaymentDetails = { ...FALLBACK_MANUAL_PAYMENT_DETAILS };

  private readonly pageShowHandler = (event: PageTransitionEvent) => {
    if (event.persisted) {
      this.cleanupModal();
    }
  };

  private get canUseDom(): boolean {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }

  banks = [
  {
    name: 'ICICI BANK',
    beneficiaryName: 'Richman Fincap Limited',
    accountNumber: '034305005641',
    ifscCode: 'ICIC0000343',
    upiId: 'richmanfincap@icici'
  },
  {
    name: 'IDFC BANK',
    beneficiaryName: 'Richman Fincap Limited',
    accountNumber: '19711399676',
    ifscCode: 'IDFB0020194',
    upiId: 'richmanfincap@idfcbank'
  }
];

selectedBank = this.banks[1]; // default IDFC

  constructor(
    private router: Router,
    private contentService: ContentService,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.router.events.subscribe(() => {
      this.cleanupModal();
    });
  }

  ngOnInit(): void {
    this.cleanupModal();

    this.route.queryParams.subscribe((params) => {
      const orderId = params['orderId'];
      const applicationId = params['applicationId'];

      if (orderId) {
        this.orderId = orderId;
        this.applicationId = applicationId;

        if (!this.canUseDom) {
          return;
        }

        setTimeout(() => {
          const modalEl = document.getElementById('resultModal');
          if (!modalEl) {
            return;
          }

          this.resultModal = new bootstrap.Modal(modalEl, {
            backdrop: 'static',
            keyboard: false
          });

          this.resultModal.show();
          this.startPolling();
        }, 300);

        return;
      }

      if (!this.canUseDom) {
        return;
      }

      setTimeout(() => {
        this.openPanModal();
      }, 200);
    });
  }
  


  ngAfterViewInit(): void {
    if (!this.canUseDom) {
      return;
    }

    window.addEventListener('pageshow', this.pageShowHandler);
  }

  ngOnDestroy(): void {
    if (this.canUseDom) {
      window.removeEventListener('pageshow', this.pageShowHandler);
    }

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  get defaultRepaymentAmount(): number {
    return this.toNumber(this.dues?.payableAmount ?? this.summary?.payableAmount);
  }

  get isManualPaymentActive(): boolean {
    return this.shouldUseManualPayment(this.defaultRepaymentAmount);
  }

  get selectedPaymentAmount(): number {
    return this.getSelectedPaymentAmount();
  }

get upiPaymentLink(): string {
  const payee = encodeURIComponent(this.selectedBank.upiId);
  const name = encodeURIComponent(this.selectedBank.beneficiaryName);

  const amount = this.selectedPaymentAmount || 0; // optional

  return `upi://pay?pa=${payee}&pn=${name}&am=${amount}&cu=INR`;
}

get qrCodeUrl(): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(this.upiPaymentLink)}`;
}

  cleanupModal(): void {
    if (!this.canUseDom) {
      return;
    }

    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach((element) => element.remove());

    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }

  isValidPan(): boolean {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(this.panValue);
  }

  submitPan(): void {
    if (!this.isValidPan()) {
      return;
    }

    this.contentService.requestPanOtp({ pan: this.panValue }).subscribe({
      next: (res: any) => {
        if (!res?.success) {
          this.toastr.error(getFirstApiErrorMessage(res, 'Something went wrong'));
          return;
        }

        const data = res?.data || {};

        this.otpTxnId = data.otpTxnId || '';
        this.applicationId = data.applicationId || '';
        this.applicationNumber = data.applicationNumber || '';
        this.destinationMobile = data.destinationMobile || '';
        this.showOtpScreen = true;
        this.showScannerFallbackCard = false;
        this.cdr.detectChanges();

        this.toastr.success('OTP sent successfully');
      },
      error: (err) => {
        this.toastr.error(getFirstApiErrorMessage(err, 'OTP request failed'));
      }
    });
  }

  verifyOtp(): void {
    if (!this.otpCode) {
      this.toastr.warning('Please enter OTP');
      return;
    }

    const payload = {
      otpTxnId: this.otpTxnId,
      otpCode: this.otpCode
    };

    this.contentService.verifyPanOtp(payload).subscribe({
      next: (res: any) => {
        if (!res?.success) {
          this.toastr.error(getFirstApiErrorMessage(res, 'OTP verification failed'));
          return;
        }

        const data = res?.data || {};

        this.borrower = data.borrower;
        this.application = data.application;
        this.loan = data.loan;
        this.summary = data.summary;
        this.dues = data.dues;
        this.repayToken = data.repayToken || '';

        this.showPaymentSection = false;
        this.showScannerFallbackCard = false;
        this.paymentType = 'FULL';
        this.amount = 0;
        this.cdr.detectChanges();

        this.applyManualPaymentRules(data);

        if (this.canUseDom) {
          localStorage.setItem('repayToken', this.repayToken);
        }

        this.toastr.success('OTP verified successfully');
        this.modalInstance?.hide();

        if (this.isManualPaymentActive && this.canUseDom) {
          setTimeout(() => {
            this.openManualPaymentModal();
          }, 300);
        }
      },
      error: (err) => {
        this.toastr.error(getFirstApiErrorMessage(err, 'Invalid OTP'));
      }
    });
  }

  startPayment(): void {
    if (this.showScannerFallbackCard) {
      this.openPanModal();
      return;
    }

    if (this.isManualPaymentActive && !this.manualPaymentCtaAcknowledged) {
      this.manualPaymentCtaAcknowledged = true;
      this.openManualPaymentModal();
      return;
    }

    this.showPaymentSection = true;
  }

  createPayment(): void {
    if (!this.repayToken) {
      this.toastr.error('Session expired');
      return;
    }

    if (this.paymentType === 'PARTIAL') {
      if (!this.amount || this.amount <= 0) {
        this.toastr.warning('Enter valid amount');
        return;
      }

      if (this.amount > this.defaultRepaymentAmount) {
        this.toastr.warning('Amount cannot exceed payable');
        return;
      }
    }

    const selectedAmount = this.getSelectedPaymentAmount();

    if (this.shouldUseManualPayment(selectedAmount)) {
      this.openManualPaymentModal();
      return;
    }

    const payload = {
      repayToken: this.repayToken,
      amount: this.paymentType === 'FULL' ? 1 : this.amount,
      paymentType: this.paymentType,
      returnUrl: this.canUseDom ? `${window.location.origin}/pay-now` : '/pay-now'
    };

    this.contentService.createRepaymentOrder(payload).subscribe({
      next: (res: any) => {
        if (!res?.success) {
          this.toastr.error(getFirstApiErrorMessage(res, 'Payment failed to initiate'));
          return;
        }

        const data = res?.data || {};
        const paymentGatewayOrder = data?.paymentGatewayOrder || {};
        const cashfree = data?.cashfree || {};

        this.orderId = paymentGatewayOrder?.orderId || data?.orderId || '';
        this.hostedPaymentUrl =
          cashfree?.hostedPaymentUrl ||
          paymentGatewayOrder?.hostedPaymentUrl ||
          data?.hostedPaymentUrl ||
          '';

        if (this.orderId) {
          if (this.canUseDom) {
            localStorage.setItem('orderId', this.orderId);
          }
        }

        if (this.hostedPaymentUrl && this.canUseDom) {
          window.location.href = this.hostedPaymentUrl;
          return;
        }

        if (
          this.readBooleanFlag([
            data?.manualPaymentRequired,
            data?.requiresManualPayment,
            paymentGatewayOrder?.manualPaymentRequired
          ])
        ) {
          this.openManualPaymentModal();
          return;
        }

        this.toastr.error('Payment failed to initiate');
      },
      error: (err) => {
        this.toastr.error(getFirstApiErrorMessage(err, 'Payment failed to initiate'));
      }
    });
  }

  startPolling(): void {
    if (!this.canUseDom) {
      return;
    }

    const repayToken = localStorage.getItem('repayToken');

    if (!repayToken || !this.orderId) {
      return;
    }

    this.pollInterval = setInterval(() => {
      const payload = {
        repayToken,
        orderId: this.orderId
      };

      this.contentService.refreshPayment(payload).subscribe((res: any) => {
        if (!res?.success) {
          return;
        }

        const data = res?.data || {};

        this.paymentStatus = data?.paymentGatewayOrder;
        this.paymentDetails = data?.payment;
        this.repaymentInfo = data?.repayment;

        if (
          data?.paymentGatewayOrder?.paidAt ||
          data?.paymentGatewayOrder?.paymentStatus === 'FAILED'
        ) {
          clearInterval(this.pollInterval);
          this.pollInterval = null;
        }
      });
    }, 5000);
  }

  openManualPaymentModal(): void {
    if (!this.canUseDom) {
      return;
    }

    const modalEl = document.getElementById('manualPaymentModal');
    if (!modalEl) {
      return;
    }

    if (!this.manualPaymentModal) {
      this.manualPaymentModal = new bootstrap.Modal(modalEl, {
        backdrop: true,
        keyboard: true
      });
    }

    this.manualPaymentModal.show();
  }

  closeManualPaymentModal(): void {
    this.manualPaymentModal?.hide();
    this.cleanupModal();
  }

  copyPaymentDetail(value: string, label: string): void {
    if (!value || !this.canUseDom) {
      return;
    }

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(value).then(() => {
        this.toastr.success(`${label} copied`);
      }).catch(() => {
        this.copyWithFallback(value, label);
      });
      return;
    }

    this.copyWithFallback(value, label);
  }

closePanModal(): void {
  this.modalInstance?.hide();

  // 🔥 FORCE SHOW SCAN CARD
  this.showScannerFallbackCard = true;

  // 🔥 HIDE OTHER SECTIONS
  this.showPaymentSection = false;

  this.cleanupModal();
}

  closeResultModal(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.resultModal?.hide();
    this.cleanupModal();
  }

  goHome(): void {
    if (this.canUseDom) {
      window.location.href = '/';
    }
  }

  private openPanModal(): void {
    if (!this.canUseDom) {
      return;
    }

    this.resetPanModalState();

    const modalEl = document.getElementById('panModal');
    if (!modalEl) {
      return;
    }

    if (!this.modalInstance) {
      this.modalInstance = new bootstrap.Modal(modalEl, {
        backdrop: 'static',
        keyboard: false
      });
    }

    this.modalInstance.show();
  }

  private applyManualPaymentRules(data: any): void {
    const paymentOptions = data?.paymentOptions || data?.paymentMeta || data?.collectionConfig || {};
    const manualDetails =
      data?.manualPaymentDetails ||
      data?.collectionAccount ||
      data?.paymentDetails ||
      data?.bankTransferDetails ||
      {};

    this.manualPaymentThreshold = this.resolveManualPaymentThreshold(data, paymentOptions);
    this.manualPaymentRequired = this.readBooleanFlag([
      data?.manualPaymentRequired,
      data?.requiresManualPayment,
      paymentOptions?.manualPaymentRequired,
      paymentOptions?.requiresManualPayment
    ]);
    this.manualPaymentCtaAcknowledged = false;
    this.manualPaymentDetails = {
      beneficiaryName:
        manualDetails?.beneficiaryName ||
        paymentOptions?.beneficiaryName ||
        FALLBACK_MANUAL_PAYMENT_DETAILS.beneficiaryName,
      accountNumber:
        manualDetails?.accountNumber ||
        paymentOptions?.accountNumber ||
        FALLBACK_MANUAL_PAYMENT_DETAILS.accountNumber,
      ifscCode:
        manualDetails?.ifscCode ||
        manualDetails?.ifsc ||
        paymentOptions?.ifscCode ||
        FALLBACK_MANUAL_PAYMENT_DETAILS.ifscCode,
      upiId:
        manualDetails?.upiId ||
        paymentOptions?.upiId ||
        FALLBACK_MANUAL_PAYMENT_DETAILS.upiId,
      note:
        manualDetails?.note ||
        paymentOptions?.note ||
        FALLBACK_MANUAL_PAYMENT_DETAILS.note,
      warning:
        manualDetails?.warning ||
        paymentOptions?.warning ||
        FALLBACK_MANUAL_PAYMENT_DETAILS.warning
    };
  }

  private resolveManualPaymentThreshold(data: any, paymentOptions: any): number {
    const candidates = [
      paymentOptions?.manualPaymentThreshold,
      paymentOptions?.thresholdAmount,
      paymentOptions?.paymentThreshold,
      data?.manualPaymentThreshold,
      data?.thresholdAmount,
      data?.paymentThreshold,
      data?.dues?.manualPaymentThreshold,
      data?.dues?.thresholdAmount,
      data?.summary?.manualPaymentThreshold,
      data?.summary?.thresholdAmount,
      data?.application?.manualPaymentThreshold,
      data?.loan?.manualPaymentThreshold
    ];

    for (const candidate of candidates) {
      const amount = this.toNumber(candidate);
      if (amount > 0) {
        return amount;
      }
    }

    return DEFAULT_MANUAL_PAYMENT_THRESHOLD;
  }

  private shouldUseManualPayment(amount: number): boolean {
    if (this.manualPaymentRequired) {
      return true;
    }

    return this.manualPaymentThreshold > 0 && amount >= this.manualPaymentThreshold;
  }

  private getSelectedPaymentAmount(): number {
    return this.paymentType === 'FULL' ? this.defaultRepaymentAmount : this.toNumber(this.amount);
  }

  private readBooleanFlag(values: any[]): boolean {
    return values.some((value) => value === true || value === 'true');
  }

  private resetPanModalState(): void {
    this.panValue = '';
    this.showOtpScreen = false;
    this.otpCode = '';
    this.otpTxnId = '';
    this.destinationMobile = '';
  }

  private copyWithFallback(value: string, label: string): void {
    if (!this.canUseDom) {
      return;
    }

    const input = document.createElement('input');
    input.value = value;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    this.toastr.success(`${label} copied`);
  }

  private toNumber(value: any): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
