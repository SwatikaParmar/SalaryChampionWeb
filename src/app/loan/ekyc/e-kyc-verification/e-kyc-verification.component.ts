import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-e-kyc-verification',
  templateUrl: './e-kyc-verification.component.html',
  styleUrl: './e-kyc-verification.component.css'
})
export class EKYCVerificationComponent {

  constructor(
    private router: Router,
  ) {}



  
  verifyEkyc(){
 this.router.navigate(['dashboard/loan/bank']);
  }
}
