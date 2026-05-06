import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ContentService } from '../../../service/content.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { getFirstApiErrorMessage } from '../../../service/api-error.util';
declare var bootstrap: any;

@Component({
  selector: 'app-disbursal',
  templateUrl: './disbursal.component.html',
  styleUrls: ['./disbursal.component.css'],
})
export class DisbursalComponent implements OnInit {
  disbursalForm!: FormGroup;
  applicationId!: string;
  isSubmitting = false;
  id: any;
  isAccountReadonly = false;
  userId: any;
  ifscSuggestions: Array<{ ifscCode: string; bankName: string; city: string }> =
    [];
  selectedIfscOption: { ifscCode: string; bankName: string; city: string } | null =
    null;
  showIfscSuggestions = false;
  showIfscDetails = false;
  isIfscLookupLoading = false;
  private lastIfscQueried = '';

  constructor(
    private fb: FormBuilder,
    private contentService: ContentService,
    private spinner: NgxSpinnerService, // ✅ spinner
    private toastr: ToastrService, // ✅ toaster
    private router:Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.getBorrowerSnapshot();
  }

  /* ===============================
     FORM INITIALIZATION
  =============================== */
  initForm() {
    this.disbursalForm = this.fb.group({
      accountNumber: [
        '',
        [Validators.required, this.accountNumberValidator.bind(this)],
      ],
      ifsc: [
        '',
        [Validators.required, Validators.pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)],
      ],
      holderName: ['', Validators.required],
      mobile: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
    });
  }

  accountNumberValidator(control: any) {
    const value: string = control.value;
    if (!value) return null;

    // ✅ masked value allowed
    if (/X/i.test(value)) return null;

    // ✅ real account number validation
    return /^\d{9,18}$/.test(value) ? null : { invalidAccount: true };
  }

  /* ===============================
     GET SNAPSHOT
  =============================== */
  getBorrowerSnapshot() {
    this.spinner.show();

    this.contentService.getBorrowerSnapshot().subscribe({
      next: (res: any) => {
        if (!res?.success) {
          this.spinner.hide();
          this.toastr.error(getFirstApiErrorMessage(res, 'Failed to load borrower details'));
          return;
        }
        this.applicationId = res.data.application?.id;
        this.userId = res.data.user.id;
        this.getDisbursalBankDetails();
      },
      error: (err) => {
        this.spinner.hide();
        this.toastr.error(getFirstApiErrorMessage(err, 'Failed to fetch borrower snapshot'));
      },
    });
  }

  /* ===============================
     GET BANK DETAILS (PREFILL)
  =============================== */
  getDisbursalBankDetails() {
    this.contentService
      .getDisbursalBankStatement(this.applicationId)
      .subscribe({
        next: (res: any) => {
          this.spinner.hide();

          if (!res?.success || !res.data?.length) return;

          const bank = res.data[0];
          const accountNumber = bank.accountNumber || '';

          this.disbursalForm.patchValue({
            ifsc: bank.ifsc,
            holderName: bank.holderName,
            mobile: bank.mobile,
            accountNumber,
          });

          this.id = bank.id;
          this.isAccountReadonly = !!accountNumber;

          const existingIfsc = (bank.ifsc || '').toUpperCase();
          if (existingIfsc.length === 11) {
            this.lookupIfsc(existingIfsc);
          }
        },
        error: (err) => {
          this.spinner.hide();
          this.toastr.error(getFirstApiErrorMessage(err, 'Failed to fetch bank details'));
        },
      });
  }

  /* ===============================
     SUBMIT BANK DETAILS
  =============================== */
submit() {
  if (this.disbursalForm.invalid || this.isSubmitting || !this.isIfscVerified) {
    this.disbursalForm.markAllAsTouched();
    return;
  }

  this.isSubmitting = true;
  this.spinner.show();

  // ✅ payload me id sirf tab add hogi jab value ho
const payload: any = {
  applicationId: this.applicationId,
  ...this.disbursalForm.getRawValue(),
  ...(this.userId ? { id: this.userId } : {}) // ✅ updated
};
  this.contentService.disbursalBankAccount(payload).subscribe({
    next: (res: any) => {
      if (!res?.success) {
        this.spinner.hide();
        this.isSubmitting = false;
        this.toastr.error(
          getFirstApiErrorMessage(res, 'Failed to save bank details'),
        );
        return;
      }
debugger
      // ✅ STEP 1: Bank details saved
      // this.toastr.success('Bank details saved successfully');

      // ✅ STEP 2: Penny Drop hit
      this.hitPennyDrop();
    },
    error: (err) => {
      this.spinner.hide();
      this.isSubmitting = false;
      this.toastr.error(
        getFirstApiErrorMessage(err, 'Failed to save bank details'),
      );
    },
  });
}


onIfscInput(event: Event) {
  const input = event.target as HTMLInputElement;
  const upperValue = input.value.toUpperCase();

  // update input UI
  input.value = upperValue;

  // update form control without infinite loop
  this.disbursalForm.get('ifsc')?.setValue(upperValue, { emitEvent: false });

  if (upperValue.length === 11) {
    this.lookupIfsc(upperValue);
    return;
  }

  this.lastIfscQueried = '';
  this.ifscSuggestions = [];
  this.showIfscSuggestions = false;
  this.selectedIfscOption = null;
  this.showIfscDetails = false;
}

lookupIfsc(ifscCode: string) {
  if (!ifscCode || ifscCode.length !== 11 || this.lastIfscQueried === ifscCode) {
    return;
  }

  this.lastIfscQueried = ifscCode;
  this.isIfscLookupLoading = true;
  this.ifscSuggestions = [];

  this.contentService.ifscLookup(ifscCode).subscribe({
    next: (res: any) => {
      this.isIfscLookupLoading = false;

      const details = res?.data?.details;
      if (!res?.success || !details?.ifscCode) {
        this.showIfscSuggestions = false;
        this.selectedIfscOption = null;
        this.showIfscDetails = false;
        return;
      }

      this.ifscSuggestions = [
        {
          ifscCode: details.ifscCode,
          bankName: details.bankName || '-',
          city: details.city || '-',
        },
      ];
      this.selectedIfscOption = this.ifscSuggestions[0];
      this.showIfscSuggestions = true;
    },
    error: () => {
      this.isIfscLookupLoading = false;
      this.showIfscSuggestions = false;
      this.ifscSuggestions = [];
      this.selectedIfscOption = null;
      this.showIfscDetails = false;
    },
  });
}

onIfscFocus() {
  if (this.ifscSuggestions.length) {
    this.showIfscSuggestions = true;
  }
}

onIfscBlur() {
  // Delay so mousedown selection can run before list hides.
  setTimeout(() => {
    this.showIfscSuggestions = false;
  }, 150);
}

selectIfsc(option: { ifscCode: string; bankName: string; city: string }) {
  this.disbursalForm.get('ifsc')?.setValue(option.ifscCode);
  this.ifscSuggestions = [option];
  this.selectedIfscOption = option;
  this.showIfscSuggestions = false;
  this.showIfscDetails = false;
}

toggleIfscDetails(event: Event) {
  event.preventDefault();
  event.stopPropagation();

  if (!this.selectedIfscOption) {
    return;
  }

  this.showIfscDetails = !this.showIfscDetails;
}

closeIfscDetails() {
  this.showIfscDetails = false;
}


hitPennyDrop() {
  const payload = {
    applicationId: this.applicationId
  };

  this.contentService.pennyDrop(payload).subscribe({
    next: (res: any) => {
      this.spinner.hide();
      this.isSubmitting = false;

      const pennyDropStatus = (res?.data?.bankAccount?.pennyDropStatus || '').toUpperCase();
      const providerReason =
        res?.data?.provider?.reason ||
        getFirstApiErrorMessage(res, 'Penny drop verification failed');

      if (res?.success && pennyDropStatus === 'MATCHED') {
        // 🔥 OPEN SUCCESS MODAL
        const modalEl = document.getElementById('pennyDropSuccessModal');
        if (modalEl) {
          const modal = new bootstrap.Modal(modalEl);
          modal.show();
        }

        //  this.router.navigate(['/dashboard/loan']);

      } else {
        this.toastr.error(providerReason);
      }
    },
    error: (err) => {
      this.spinner.hide();
      this.isSubmitting = false;
      this.toastr.error(getFirstApiErrorMessage(err, 'Penny drop failed'));
    }
  });
}

onPennyDropOk() {
  const modalEl = document.getElementById('pennyDropSuccessModal');
  if (modalEl) {
    const modal = bootstrap.Modal.getInstance(modalEl);
    modal?.hide();
  }

  // 🔥 NAVIGATE AFTER OK
  this.router.navigate(['/dashboard/loan']);
  // 👆 change route as per your flow
}


  /* ===============================
     FORM GETTERS
  =============================== */
  get f() {
    return this.disbursalForm.controls as {
      accountNumber: any;
      ifsc: any;
      holderName: any;
      mobile: any;
    };
  }

  get isIfscVerified(): boolean {
    const ifscValue = this.disbursalForm.get('ifsc')?.value;
    return !!(
      this.selectedIfscOption &&
      ifscValue &&
      ifscValue === this.selectedIfscOption.ifscCode &&
      !this.isIfscLookupLoading
    );
  }
}
