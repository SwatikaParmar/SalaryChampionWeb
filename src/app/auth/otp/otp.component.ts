import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthServiceService } from '../../../service/auth-service.service';

@Component({
  selector: 'app-otp',
  templateUrl: './otp.component.html',
  styleUrl: './otp.component.css',
})
export class OtpComponent implements OnInit {
  otpForm!: FormGroup;
  isLoading = false;
  phone!: string;

  otpControls = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'];

  constructor(
    private fb: FormBuilder,
    private auth: AuthServiceService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.phone = localStorage.getItem('loginPhone') || '';

    if (!this.phone) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.otpForm = this.fb.group({
      d1: ['', Validators.required],
      d2: ['', Validators.required],
      d3: ['', Validators.required],
      d4: ['', Validators.required],
      d5: ['', Validators.required],
      d6: ['', Validators.required],
    });
  }

  moveNext(event: any, index: number) {
    const input = event.target;
    if (input.value && index < this.otpControls.length - 1) {
      input.nextElementSibling?.focus();
    }
  }

  verifyOtp() {
    if (this.otpForm.invalid || this.isLoading) return;

    this.isLoading = true;

    const code = Object.values(this.otpForm.value).join('');

    const payload = {
      phone: this.phone,
      code,
      purpose: 'login',
    };

    this.auth.verifyOtp(payload).subscribe({
      next: (res: any) => {
        this.isLoading = false;

        if (!res?.success) {
          alert('Invalid OTP');
          return;
        }

        const data = res.data;

        // 🔐 SAVE TOKENS
        localStorage.setItem('accessToken', data.auth.access_token);
        localStorage.setItem('refreshToken', data.auth.refresh_token);

        // ✅ THIS WAS MISSING (CRITICAL)
        this.auth.setCurrentUser(data.user);

        // 🚦 FLOW BASED ROUTING
        const roles = data.user.roles || [];

        if (roles.includes('BORROWER')) {
          if (!data.basicFlow.steps.panVerification) {
            this.router.navigate(['/dashboard/profile/pan']);
          } else if (!data.basicFlow.steps.basicInformation) {
            this.router.navigate(['/dashboard/profile/basic-info']);
          } else {
            this.router.navigate(['/dashboard']);
          }
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: () => {
        this.isLoading = false;
        alert('OTP verification failed');
      },
    });
  }

  resendOtp() {
    const payload = {
      phone: this.phone,
      purpose: 'login',
    };

    this.auth.otp(payload).subscribe(() => {
      alert('OTP resent successfully');
    });
  }
}
