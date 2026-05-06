import { isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { AuthServiceService } from '../../../service/auth-service.service';
import { getFirstApiErrorMessage } from '../../../service/api-error.util';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  mobileForm!: FormGroup;
  isLoading = false;
  isLocationLoading = false;
  lat: number | null = null;
  long: number | null = null;
  private readonly isBrowser: boolean;

  constructor(
    private fb: FormBuilder,
    private authService: AuthServiceService,
    private router: Router,
    private spinner: NgxSpinnerService,
    private toastr: ToastrService,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.mobileForm = this.fb.group({
      mobile: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
      agree: [false, Validators.requiredTrue],
    });

    const savedMobile = this.isBrowser
      ? localStorage.getItem('loginMobile')
      : null;
    if (savedMobile) {
      this.mobileForm.patchValue({
        mobile: savedMobile,
        agree: true,
      });
    }

    const savedLocation = this.authService.getSavedLoginLocation();
    if (savedLocation) {
      this.lat = savedLocation.lat;
      this.long = savedLocation.long;
    } else {
      this.authService
        .prefetchLocationIfAvailable()
        .then(() => {
          const latestLocation = this.authService.getSavedLoginLocation();
          if (!latestLocation) {
            return;
          }

          this.lat = latestLocation.lat;
          this.long = latestLocation.long;
        })
        .catch(() => {});
    }
  }

  async sendOtp() {
    if (this.mobileForm.invalid || this.isLoading) {
      this.toastr.warning('Please enter valid mobile & accept terms');
      return;
    }

    if (!(await this.ensureLocation())) {
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
          if (this.isBrowser) {
            localStorage.setItem('loginPhone', payload.phone);
            localStorage.setItem('loginMobile', this.mobileForm.value.mobile);
            localStorage.setItem(
              'otpTimer',
              res?.data?.nextRequestInSec?.toString() || '45',
            );
          }

          this.toastr.success(res?.message || 'OTP sent successfully');
          this.router.navigate(['/auth/otp'], { replaceUrl: true });
        } else {
          this.toastr.error(getFirstApiErrorMessage(res, 'Failed to send OTP'));
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.spinner.hide();
        this.toastr.error(getFirstApiErrorMessage(err, 'Something went wrong'));
      },
    });
  }

  allowNumbersOnly(event: KeyboardEvent) {
    const charCode = event.which ? event.which : event.keyCode;

    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
    }
  }

  removeNonNumeric(event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9]/g, '');

    this.mobileForm.get('mobile')?.setValue(input.value, {
      emitEvent: false,
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
      const location = await this.authService.requestCurrentLocation();
      this.lat = location.lat;
      this.long = location.long;
      return true;
    } catch (error: any) {
      if (error?.code === error?.PERMISSION_DENIED) {
        this.toastr.warning('Please allow location access to continue');
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
