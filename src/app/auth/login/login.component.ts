import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
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
    private router: Router,
    private spinner: NgxSpinnerService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.mobileForm = this.fb.group({
      mobile: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
      agree: [false, Validators.requiredTrue],
    });
  }
  sendOtp() {
    if (this.mobileForm.invalid || this.isLoading) {
      this.toastr.warning('Please enter valid mobile & accept terms');
      return;
    }

    this.isLoading = true;
    this.spinner.show(); // ✅ SHOW SPINNER

    const payload = {
      phone: '+91' + this.mobileForm.value.mobile,
      purpose: 'login',
    };

    this.authService.otp(payload).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.spinner.hide(); // ✅ HIDE SPINNER
        debugger;
        if (res?.success) {
          localStorage.setItem('loginPhone', payload.phone);
          this.toastr.success(res?.message || 'OTP sent successfully');
          this.router.navigate(['/auth/otp']);
        } else {
          this.toastr.error(res?.message || 'Failed to send OTP');
        }
      },

      error: (err) => {
        this.isLoading = false;
        this.spinner.hide(); // ✅ HIDE SPINNER

        this.toastr.error(
          err?.error?.message || 'Something went wrong. Try again',
        );
      },
    });
  }

  allowNumbersOnly(event: KeyboardEvent) {
  const charCode = event.which ? event.which : event.keyCode;

  // Allow only 0–9
  if (charCode < 48 || charCode > 57) {
    event.preventDefault();
  }
}

removeNonNumeric(event: Event) {
  const input = event.target as HTMLInputElement;

  // Remove anything except digits
  input.value = input.value.replace(/[^0-9]/g, '');

  // Sync value back to form control
  this.mobileForm.get('mobile')?.setValue(input.value, {
    emitEvent: false,
  });
}

}
