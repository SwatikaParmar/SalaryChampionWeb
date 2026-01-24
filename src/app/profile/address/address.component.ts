import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ContentService } from '../../../service/content.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-address',
  templateUrl: './address.component.html',
  styleUrl: './address.component.css',
})
export class AddressComponent implements OnInit {
  addressForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private contentService: ContentService,
    private router: Router,
       private spinner: NgxSpinnerService,   // ✅ spinner
    private toastr: ToastrService         // ✅ toaster
  ) {}

  ngOnInit(): void {
    this.addressForm = this.fb.group({
      typeCode: ['CURRENT'],
      line1: ['', Validators.required],
      line2: [''],
      landmark: ['', Validators.required],
      pincode: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
      city: ['', Validators.required],
      state: ['', Validators.required],
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

    const payload = this.addressForm.getRawValue();

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

    // ⛔ Invalid pincode → reset & enable
    if (!pincode || pincode.length !== 6) {
      cityCtrl?.reset();
      stateCtrl?.reset();
      cityCtrl?.enable();
      stateCtrl?.enable();
      return;
    }

    this.contentService.resolvePincode(pincode).subscribe({
      next: (res: any) => {
        if (res?.success && res?.data) {
          // ✅ STATE → ALWAYS from API (LOCKED)
          if (res.data.stateName) {
            stateCtrl?.setValue(res.data.stateName);
            stateCtrl?.disable();
          }

          // ✅ CITY → if API sends it → LOCK
          if (res.data.city) {
            cityCtrl?.setValue(res.data.city);
            cityCtrl?.disable();
          }
          // ❗ CITY null → manual entry allowed
          else {
            cityCtrl?.reset();
            cityCtrl?.enable();
          }
        } else {
          // fallback
          cityCtrl?.enable();
          stateCtrl?.enable();
        }
      },
      error: () => {
        cityCtrl?.enable();
        stateCtrl?.enable();
        console.error('Pincode resolve failed');
      },
    });
  }

  getBorrowerSnapshot() {
    this.contentService.getBorrowerSnapshot().subscribe({
      next: (res: any) => {
        if (res?.success && res?.data?.addresses?.length) {
          const currentAddress = res.data.addresses.find(
            (addr: any) => addr.typeCode === 'CURRENT'
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
      city: address.city || '',
      state: address.state || '',
      residenceType: address.residenceTypeCode || '',
      residingSince: address.residingSince || '',
    });

    // 🔒 If city/state already available → lock them
    if (address.state) {
      this.addressForm.get('state')?.disable();
    }

    if (address.city) {
      this.addressForm.get('city')?.disable();
    }
  }
}
