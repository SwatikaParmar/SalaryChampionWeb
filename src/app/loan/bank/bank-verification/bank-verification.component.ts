import { Component } from '@angular/core';

@Component({
  selector: 'app-bank-verification',
  templateUrl: './bank-verification.component.html',
  styleUrls: ['./bank-verification.component.css']
})
export class BankVerificationComponent {

  verifyBankConsent() {
    // ✅ Call consent-status API or redirect
    console.log('Verify bank consent clicked');
  }

  skipProcess() {
    console.log('User skipped bank verification');
    // route to next step
  }

  reInitiate() {
    console.log('Re-initiate bank consent flow');
    // call API to re-create consent
  }
}
