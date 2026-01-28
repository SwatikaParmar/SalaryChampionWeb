import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthServiceService } from '../../../service/auth-service.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';

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
    private router: Router,
    private toastr: ToastrService,
    private spinner: NgxSpinnerService
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
 /* ================= VERIFY OTP ================= */
  verifyOtp() {
    if (this.otpForm.invalid || this.isLoading) {
      this.toastr.warning('Please enter complete OTP');
      return;
    }

    this.isLoading = true;
    this.spinner.show();

    const code = Object.values(this.otpForm.value).join('');

    const payload = {
      phone: this.phone,
      code,
      purpose: 'login',
    };

    this.auth.verifyOtp(payload).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.spinner.hide();

        if (!res?.success) {
          this.toastr.error(res?.message || 'Invalid OTP');
          return;
        }

        const data = res.data;

        // 🔐 Save tokens
        localStorage.setItem('accessToken', data.auth.access_token);
        localStorage.setItem('refreshToken', data.auth.refresh_token);

        // ✅ Set logged-in user
        this.auth.setCurrentUser(data.user);

        this.toastr.success('OTP verified successfully');

        // 🚦 Flow based routing
        const roles = data.user.roles || [];

        if (roles.includes('BORROWER')) {
          if (!data.basicFlow?.steps?.panVerification) {
            this.router.navigate(['/dashboard/profile/pan']);
          } else if (!data.basicFlow?.steps?.basicInformation) {
            this.router.navigate(['/dashboard/profile/basic-info']);
          } else {
            this.router.navigate(['/dashboard']);
          }
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.spinner.hide();
        this.toastr.error(err?.error?.message || 'OTP verification failed');
      },
    });
  }

  /* ================= RESEND OTP ================= */
  resendOtp() {
    if (this.isLoading) return;

    this.isLoading = true;
    this.spinner.show();

    const payload = {
      phone: this.phone,
      purpose: 'login',
    };

    this.auth.otp(payload).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.spinner.hide();
        this.toastr.success(res?.message || 'OTP resent successfully');
      },
      error: () => {
        this.isLoading = false;
        this.spinner.hide();
        this.toastr.error('Failed to resend OTP');
      },
    });
  }
}
