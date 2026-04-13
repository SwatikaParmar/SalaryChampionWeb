import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContentService } from '../../../service/content.service';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute } from '@angular/router';
import { getFirstApiErrorMessage } from '../../../service/api-error.util';
declare var bootstrap: any;

@Component({
  selector: 'app-pay-now-landing',
  templateUrl: './pay-now-landing.component.html',
  styleUrl: './pay-now-landing.component.css'
})
export class PayNowLandingComponent implements OnInit {

  panValue: string = '';
  modalInstance: any;



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

  constructor(private router: Router, private contentService:ContentService,
    private toastr:ToastrService,
      private route: ActivatedRoute,


  ) {
  this.router.events.subscribe(() => {
    this.cleanupModal();
  });
}

ngOnInit(): void {

  this.cleanupModal();

  this.route.queryParams.subscribe(params => {

    const orderId = params['orderId'];
    const applicationId = params['applicationId'];

    if (orderId) {

      this.orderId = orderId;
      this.applicationId = applicationId;

      setTimeout(() => {
        const modalEl = document.getElementById('resultModal');

        this.resultModal = new bootstrap.Modal(modalEl, {
          backdrop: 'static',
          keyboard: false
        });

        this.resultModal.show();

        // 🔥 polling start
        this.startPolling();

      }, 300);

    } else {

      // PAN modal
      setTimeout(() => {
        const modalEl = document.getElementById('panModal');

        this.modalInstance = new bootstrap.Modal(modalEl, {
          backdrop: 'static',
          keyboard: false
        });

        this.modalInstance.show();

      }, 200);
    }

  });
}

cleanupModal() {

  // remove backdrop
  const backdrops = document.querySelectorAll('.modal-backdrop');
  backdrops.forEach(el => el.remove());

  // remove modal-open class
  document.body.classList.remove('modal-open');

  // reset body style
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
}



isValidPan(): boolean {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(this.panValue);
}



ngAfterViewInit() {
  window.addEventListener('pageshow', (event: any) => {
    if (event.persisted) {
      this.cleanupModal(); // 🔥 fix bfcache issue
    }
  });
}


submitPan() {

  if (!this.isValidPan()) return;

  const payload = {
    pan: this.panValue
  };

  this.contentService.requestPanOtp(payload).subscribe({

    next: (res: any) => {

      // ❌ HANDLE BUSINESS ERROR (success = false)
      if (!res?.success) {
        this.toastr.error(getFirstApiErrorMessage(res, 'Something went wrong'));
        return;
      }

      const data = res.data;

      // ✅ STORE DATA
      this.otpTxnId = data.otpTxnId;
      this.applicationId = data.applicationId;
      this.applicationNumber = data.applicationNumber;
      this.destinationMobile = data.destinationMobile;

      // ✅ MOVE TO OTP SCREEN
      this.showOtpScreen = true;

      this.toastr.success('OTP sent successfully');

    },

    error: (err) => {

      // ❌ HANDLE API ERROR (500, 404 etc)
      this.toastr.error(getFirstApiErrorMessage(err, 'OTP request failed'));
    }

  });
}


borrower: any;
application: any;
loan: any;
summary: any;
dues: any;


verifyOtp() {

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

      // ❌ HANDLE BUSINESS ERROR
      if (!res?.success) {
        this.toastr.error(getFirstApiErrorMessage(res, 'OTP verification failed'));
        return;
      }

      const data = res.data;

      // ✅ STORE DATA
      this.borrower = data.borrower;
      this.application = data.application;
      this.loan = data.loan;
      this.summary = data.summary;
      this.dues = data.dues;

      this.repayToken = data.repayToken;

      localStorage.setItem('repayToken', data.repayToken);

      // ✅ SUCCESS MESSAGE
      this.toastr.success('OTP verified successfully');

      // 🔥 CLOSE MODAL
      this.modalInstance.hide();

    },

    error: (err) => {

      // ❌ HANDLE HTTP ERROR (wrong OTP / expired etc)
      this.toastr.error(getFirstApiErrorMessage(err, 'Invalid OTP'));
    }

  });
}


paymentType: 'FULL' | 'PARTIAL' = 'FULL';
amount: number = 0;

repayToken = '';
orderId = '';
hostedPaymentUrl = '';

showPaymentSection = false;

startPayment() {
  this.showPaymentSection = true;
}


createPayment() {

  if (!this.repayToken) {
    alert('Session expired');
    return;
  }

  // ✅ validation for PARTIAL
  if (this.paymentType === 'PARTIAL') {

    if (!this.amount || this.amount <= 0) {
      alert('Enter valid amount');
      return;
    }

    if (this.amount > Number(this.dues?.payableAmount)) {
      alert('Amount cannot exceed payable');
      return;
    }
  }

  const payload = {
    repayToken: this.repayToken,
    amount: this.paymentType === 'FULL' ? 1 : this.amount,
    paymentType: this.paymentType,
returnUrl: window.location.origin + '/pay-now'   };

  this.contentService.createRepaymentOrder(payload).subscribe({
    next: (res: any) => {

      if (!res?.success) {
        this.toastr.error(getFirstApiErrorMessage(res, 'Payment failed to initiate'));
        return;
      }

      const data = res.data;

      this.orderId = data.paymentGatewayOrder.orderId;
      this.hostedPaymentUrl = data.cashfree.hostedPaymentUrl;

      // 🔥 SAVE for result page
      localStorage.setItem('orderId', this.orderId);

      // 🚀 REDIRECT TO CASHFREE
      window.location.href = this.hostedPaymentUrl;

    },
    error: (err) => {
      this.toastr.error(getFirstApiErrorMessage(err, 'Payment failed to initiate'));
    }
  });
}

startPolling() {

  const repayToken = localStorage.getItem('repayToken');

  if (!repayToken || !this.orderId) return;

  this.pollInterval = setInterval(() => {

    const payload = {
      repayToken: repayToken,
      orderId: this.orderId
    };

    this.contentService.refreshPayment(payload).subscribe((res: any) => {

      if (!res?.success) return;

      const data = res.data;

      // ✅ FULL DATA STORE
      this.paymentStatus = data.paymentGatewayOrder;
      this.paymentDetails = data.payment;
      this.repaymentInfo = data.repayment;

      // ✅ STOP POLLING
      if (data.paymentGatewayOrder?.paidAt ||
          data.paymentGatewayOrder?.paymentStatus === 'FAILED') {
        clearInterval(this.pollInterval);
      }

    });

  }, 5000);
}

goHome() {
  window.location.href = '/'; // ya dashboard
}


}
