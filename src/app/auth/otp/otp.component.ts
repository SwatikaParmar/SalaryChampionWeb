import { isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { AuthServiceService } from './../../../service/auth-service.service';
import { getFirstApiErrorMessage } from '../../../service/api-error.util';

@Component({
  selector: 'app-otp',
  templateUrl: './otp.component.html',
  styleUrl: './otp.component.css',
})
export class OtpComponent implements OnInit, OnDestroy {
  otpForm!: FormGroup;
  isLoading = false;
  isLocationLoading = false;
  phone!: string;
  lat: number | null = null;
  long: number | null = null;

  otpControls = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'];
  timer = 0;
  displayTime = '00:00';
  showResend = false;
  private intervalId: any;
  private readonly isBrowser: boolean;

  constructor(
    private fb: FormBuilder,
    private auth: AuthServiceService,
    private router: Router,
    private toastr: ToastrService,
    private spinner: NgxSpinnerService,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.otpForm = this.fb.group({
      d1: ['', Validators.required],
      d2: ['', Validators.required],
      d3: ['', Validators.required],
      d4: ['', Validators.required],
      d5: ['', Validators.required],
      d6: ['', Validators.required],
    });

    this.phone = this.isBrowser ? localStorage.getItem('loginPhone') || '' : '';

    if (!this.phone) {
      if (this.isBrowser) {
        this.router.navigate(['/auth/login'], { replaceUrl: true });
      }
      return;
    }

    const savedLocation = this.auth.getSavedLoginLocation();
    if (savedLocation) {
      this.lat = savedLocation.lat;
      this.long = savedLocation.long;
    }

    const savedTimer = this.isBrowser ? localStorage.getItem('otpTimer') : null;
    this.timer = savedTimer ? +savedTimer : 60;

    if (this.isBrowser) {
      this.startCountdown();
    }

    if (this.isBrowser && (this.lat === null || this.long === null)) {
      this.getLocation();
    }
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  startCountdown() {
    if (!this.isBrowser) {
      return;
    }

    this.showResend = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.updateDisplayTime();

    this.intervalId = setInterval(() => {
      if (this.timer > 0) {
        this.timer--;
        localStorage.setItem('otpTimer', this.timer.toString());
        this.updateDisplayTime();
      } else {
        clearInterval(this.intervalId);
        localStorage.removeItem('otpTimer');
        this.showResend = true;
      }
    }, 1000);
  }

  updateDisplayTime() {
    const minutes = Math.floor(this.timer / 60);
    const seconds = this.timer % 60;

    this.displayTime =
      `${minutes.toString().padStart(2, '0')}:` +
      `${seconds.toString().padStart(2, '0')}`;
  }

  moveNext(event: any, index: number) {
    const input = event.target;
    if (input.value && index < this.otpControls.length - 1) {
      input.nextElementSibling?.focus();
    }
  }

  async verifyOtp() {
    if (this.otpForm.invalid || this.isLoading) {
      this.toastr.warning('Please enter complete OTP');
      return;
    }

    if (!(await this.ensureLocation())) {
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
          this.toastr.error(getFirstApiErrorMessage(res, 'Invalid OTP'));
          return;
        }

        const data = res.data;

        if (this.isBrowser) {
          localStorage.setItem('accessToken', data.auth.access_token);
          localStorage.setItem('refreshToken', data.auth.refresh_token);
        }

        this.auth.setCurrentUser(data.user);
        this.deviceRegister();

        this.toastr.success('OTP verified successfully');

        const roles = data.user.roles || [];

        if (roles.includes('BORROWER')) {
          if (!data.basicFlow?.steps?.panVerification) {
            this.router.navigate(['/dashboard/profile/pan'], {
              replaceUrl: true,
            });
          } else if (!data.basicFlow?.steps?.basicInformation) {
            this.router.navigate(['/dashboard/profile/basic-info'], {
              replaceUrl: true,
            });
          } else {
            this.router.navigate(['/dashboard'], { replaceUrl: true });
          }
        } else {
          this.router.navigate(['/dashboard'], { replaceUrl: true });
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.spinner.hide();
        this.toastr.error(getFirstApiErrorMessage(err, 'OTP verification failed'));
      },
    });
  }

  resendOtp() {
    if (this.isLoading || !this.showResend) {
      return;
    }

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

        if (res?.success) {
          this.toastr.success(res?.message || 'OTP resent successfully');
          this.timer = res?.data?.nextRequestInSec || 45;
          this.startCountdown();
          return;
        }

        this.toastr.error(getFirstApiErrorMessage(res, 'Failed to resend OTP'));
      },
      error: (err) => {
        this.isLoading = false;
        this.spinner.hide();
        this.toastr.error(getFirstApiErrorMessage(err, 'Failed to resend OTP'));
      },
    });
  }

  editNumber() {
    this.router.navigate(['/auth/login'], {
      queryParams: { edit: true },
      replaceUrl: true,
    });
  }

  deviceRegister() {
    const payload = {
      token: 'firebase_Token',
      platform: 'web',
      deviceId: 'WEB-' + Math.random().toString(36).substring(2),
      appVersion: '1.0.0',
      model: 'Chrome Browser',
      osVersion: 'Windows 10',
      language: 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      lat: this.lat,
      long: this.long,
    };

    this.auth.deviceRegister(payload).subscribe({
      next: (res: any) => {
        console.log('Device Registered', res);
      },
      error: (err) => {
        console.log('Device Register Error', err);
      },
    });
  }

  getLocation() {
    this.ensureLocation();
  }

  async ensureLocation(): Promise<boolean> {
    if (this.lat !== null && this.long !== null) {
      return true;
    }

    if (this.isLocationLoading) {
      this.toastr.info('Fetching location... please wait');
      return false;
    }

    this.isLocationLoading = true;
    this.spinner.show();

    try {
      const location = await this.auth.requestCurrentLocation();
      this.lat = location.lat;
      this.long = location.long;
      return true;
    } catch (error: any) {
      if (error?.code === error?.PERMISSION_DENIED) {
        this.toastr.warning('Please allow location access to continue login');
      } else {
        this.toastr.warning('Unable to fetch location. Please try again');
      }
      return false;
    } finally {
      this.isLocationLoading = false;
      this.spinner.hide();
    }
  }
}
