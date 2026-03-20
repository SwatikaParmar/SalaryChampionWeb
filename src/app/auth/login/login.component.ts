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
isLocationLoading = false;
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

  const savedMobile = localStorage.getItem('loginMobile');
  if (savedMobile) {
    this.mobileForm.patchValue({
      mobile: savedMobile,
      agree: true
    });
  }

  // 🔥 ask location when login page open
  this.getLocation();
}

sendOtp() {

  if (this.mobileForm.invalid || this.isLoading) {
    this.toastr.warning('Please enter valid mobile & accept terms');
    return;
  }

  // 🔥 WAIT FOR LOCATION
  if (this.isLocationLoading) {
    this.toastr.info('Fetching location... please wait');
    return;
  }

  // 🔥 FINAL CHECK
  if (!this.lat || !this.long) {
    this.toastr.warning('Location not available. Please try again');
    this.getLocation(); // retry silently
    return;
  }

  this.isLoading = true;
  this.spinner.show();

  const payload = {
    phone: '+91' + this.mobileForm.value.mobile,
    purpose: 'login',
  };

  this.authService.otp(payload).subscribe({
    next: (res: any) => {
      this.isLoading = false;
      this.spinner.hide();

      if (res?.success) {

        localStorage.setItem('loginPhone', payload.phone);
        localStorage.setItem('loginMobile', this.mobileForm.value.mobile);

        localStorage.setItem(
          'otpTimer',
          res?.data?.nextRequestInSec?.toString() || '45'
        );

        this.toastr.success(res?.message || 'OTP sent successfully');
        this.router.navigate(['/auth/otp']);

      } else {
        this.toastr.error(res?.message || 'Failed to send OTP');
      }
    },
    error: (err) => {
      this.isLoading = false;
      this.spinner.hide();
      this.toastr.error(err?.error?.message || 'Something went wrong');
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

lat: number | null = null;
long: number | null = null;

getLocation() {
  if (!navigator.geolocation) {
    this.toastr.error('Geolocation is not supported');
    return;
  }

  this.isLocationLoading = true;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      this.lat = position.coords.latitude;
      this.long = position.coords.longitude;
      this.isLocationLoading = false;
    },
    (error) => {
      this.isLocationLoading = false;

      if (error.code === error.PERMISSION_DENIED) {
        this.toastr.warning('Location permission denied');
      } else {
        this.toastr.warning('Unable to fetch location');
      }
    }
  );
}



}
