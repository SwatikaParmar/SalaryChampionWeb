import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { ContentService } from '../../../service/content.service';

@Component({
  selector: 'app-address',
  templateUrl: './address.component.html',
  styleUrl: './address.component.css',
})
export class AddressComponent implements OnInit {
  addressForm!: FormGroup;
  years: number[] = [];

  constructor(
    private fb: FormBuilder,
    private contentService: ContentService,
    private router: Router,
    private spinner: NgxSpinnerService, // ✅ spinner
    private toastr: ToastrService, // ✅ toaster
  ) {}

  ngOnInit(): void {
    const currentYear = new Date().getFullYear();

    for (let i = 0; i < 52; i++) {
      this.years.push(currentYear - i);
    }

    this.addressForm = this.fb.group({
      typeCode: ['CURRENT'],
      line1: ['', Validators.required],
      line2: [''],
      landmark: ['', Validators.required],
      pincode: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
      city: [{ value: '', disabled: true }, Validators.required],
      state: [{ value: '', disabled: true }, Validators.required],
      residenceType: ['', Validators.required],
      residingSince: ['', Validators.required],
    });

    // 🔥 Load existing address
    this.getBorrowerSnapshot();
  }

  submit() {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      this.toastr.warning('Please fill all required fields');
      return;
    }

    const year = this.addressForm.value.residingSince;

    // 🔥 Convert year to date (01-01-YYYY)
    const payload = {
      ...this.addressForm.getRawValue(),
      residingSince: `${year}-01-01`,
    };
    this.spinner.show(); // ✅ START spinner

    this.contentService.saveAddressDetail(payload).subscribe({
      next: (res: any) => {
        this.spinner.hide(); // ✅ STOP spinner

        if (res?.success) {
          this.toastr.success('Address saved successfully'); // ✅ success toast

          // ✅ navigate after success
          this.router.navigate(['/dashboard/profile/income']);
        } else {
          this.toastr.error(res?.message || 'Failed to save address');
        }
      },
      error: () => {
        this.spinner.hide(); // ✅ STOP spinner
        this.toastr.error('Failed to save address');
      },
    });
  }
  onPincodeChange() {
    const pincode = this.addressForm.get('pincode')?.value;
    const cityCtrl = this.addressForm.get('city');
    const stateCtrl = this.addressForm.get('state');

    // 🔒 Default → ALWAYS LOCKED
    cityCtrl?.disable({ emitEvent: false });
    stateCtrl?.disable({ emitEvent: false });

    // ❌ If pincode invalid → stop here
    if (!pincode || pincode.length !== 6) {
      cityCtrl?.reset();
      stateCtrl?.reset();
      return;
    }

    // ✅ Valid pincode → hit API
    this.contentService.resolvePincode(pincode).subscribe({
      next: (res: any) => {
        cityCtrl?.reset();
        stateCtrl?.reset();

        if (res?.success && res?.data) {
          // ✅ STATE
          if (res.data.stateName) {
            stateCtrl?.setValue(res.data.stateName);
            stateCtrl?.disable({ emitEvent: false });
          } else {
            // ❗ no state → allow edit
            stateCtrl?.enable({ emitEvent: false });
          }

          // ✅ CITY
          if (res.data.city) {
            cityCtrl?.setValue(res.data.city);
            cityCtrl?.disable({ emitEvent: false });
          } else {
            // ❗ no city → allow edit
            cityCtrl?.enable({ emitEvent: false });
          }
        } else {
          // API success false → allow manual
          cityCtrl?.enable({ emitEvent: false });
          stateCtrl?.enable({ emitEvent: false });
        }
      },
      error: () => {
        // API failed → allow manual entry
        cityCtrl?.enable({ emitEvent: false });
        stateCtrl?.enable({ emitEvent: false });
      },
    });
  }

  getBorrowerSnapshot() {
    this.contentService.getBorrowerSnapshot().subscribe({
      next: (res: any) => {
        if (res?.success && res?.data?.addresses?.length) {
          const currentAddress = res.data.addresses.find(
            (addr: any) => addr.typeCode === 'CURRENT',
          );

          if (currentAddress) {
            this.patchCurrentAddress(currentAddress);
          }
        }
      },
      error: () => {
        console.error('Failed to fetch borrower snapshot');
      },
    });
  }

  patchCurrentAddress(address: any) {
    this.addressForm.patchValue({
      line1: address.line1 || '',
      line2: address.line2 || '',
      landmark: address.landmark || '',
      pincode: address.pincode || '',
      residenceType: address.residenceTypeCode || '',
      residingSince: address.residingSince || '',
    });

    const cityCtrl = this.addressForm.get('city');
    const stateCtrl = this.addressForm.get('state');

    // 🔒 Default locked
    cityCtrl?.disable({ emitEvent: false });
    stateCtrl?.disable({ emitEvent: false });

    if (address.state) {
      stateCtrl?.setValue(address.state);
    }

    if (address.city) {
      cityCtrl?.setValue(address.city);
    }
  }
}
