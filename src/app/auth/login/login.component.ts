import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthServiceService } from '../../../service/auth-service.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  mobileForm!: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthServiceService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.mobileForm = this.fb.group({
      mobile: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
      agree: [false, Validators.requiredTrue],
    });
  }

  sendOtp() {
    if (this.mobileForm.invalid || this.isLoading) return;

    this.isLoading = true;

    const payload = {
      phone: '+91' + this.mobileForm.value.mobile,
      purpose: 'login',
    };

    console.log('SEND OTP PAYLOAD', payload);

    this.authService.otp(payload).subscribe({
      next: (res) => {
        this.isLoading = false;

        if (res?.success) {
          // ✅ store phone for OTP screen
          localStorage.setItem('loginPhone', payload.phone);

          // ✅ go to OTP screen
          this.router.navigate(['/auth/otp']);
        }
      },
      error: () => {
        this.isLoading = false;
        alert('Failed to send OTP');
      },
    });
  }
}
