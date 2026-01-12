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

  constructor(
    private fb: FormBuilder,
    private auth: AuthServiceService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // 🔐 phone jo login page se aaya
    this.phone = localStorage.getItem('loginPhone') || '';

    if (!this.phone) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    });
  }

  verifyOtp() {
    if (this.otpForm.invalid || this.isLoading) return;

    this.isLoading = true;

    const payload = {
      phone: this.phone,
      otp: this.otpForm.value.otp,
    };

    this.auth.verifyOtp(payload).subscribe({
      next: (res: any) => {
        this.isLoading = false;

        if (!res?.accessToken) {
          alert('Invalid OTP');
          return;
        }

        // ✅ save tokens

        // ✅ ROLE BASED ROUTING
        if (res.roles?.includes('BORROWER')) {
          this.router.navigate(['/profile']);
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
}
