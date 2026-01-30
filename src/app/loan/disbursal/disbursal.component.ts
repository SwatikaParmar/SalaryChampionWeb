import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ContentService } from '../../../service/content.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
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
          this.toastr.error('Failed to load borrower details');
          return;
        }

        this.applicationId = res.data.application?.id;
        this.getDisbursalBankDetails();
      },
      error: () => {
        this.spinner.hide();
        this.toastr.error('Failed to fetch borrower snapshot');
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

          this.disbursalForm.patchValue({
            ifsc: bank.ifsc,
            holderName: bank.holderName,
            mobile: bank.mobile,
            accountNumber: bank.accountNumberMasked,
          });

          this.id = bank.id;
          this.isAccountReadonly = true;
        },
        error: () => {
          this.spinner.hide();
          this.toastr.error('Failed to fetch bank details');
        },
      });
  }

  /* ===============================
     SUBMIT BANK DETAILS
  =============================== */
submit() {
  if (this.disbursalForm.invalid || this.isSubmitting) {
    this.disbursalForm.markAllAsTouched();
    return;
  }

  this.isSubmitting = true;
  this.spinner.show();

  // ✅ payload me id sirf tab add hogi jab value ho
  const payload: any = {
    applicationId: this.applicationId,
    ...this.disbursalForm.getRawValue(),
    ...(this.id ? { id: this.id } : {}) // 🔥 MAGIC LINE
  };

  this.contentService.disbursalBankAccount(payload).subscribe({
    next: (res: any) => {
      if (!res?.success) {
        this.spinner.hide();
        this.isSubmitting = false;
        this.toastr.error('Failed to save bank details');
        return;
      }

      // ✅ STEP 1: Bank details saved
      this.toastr.success('Bank details saved successfully ✅');

      // ✅ STEP 2: Penny Drop hit
      this.hitPennyDrop();
    },
    error: () => {
      this.spinner.hide();
      this.isSubmitting = false;
      this.toastr.error('Something went wrong');
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
}


hitPennyDrop() {
  const payload = {
    applicationId: this.applicationId
  };

  this.contentService.pennyDrop(payload).subscribe({
    next: (res: any) => {
      this.spinner.hide();
      this.isSubmitting = false;

      if (res?.success) {
        // 🔥 OPEN SUCCESS MODAL
        const modalEl = document.getElementById('pennyDropSuccessModal');
        if (modalEl) {
          const modal = new bootstrap.Modal(modalEl);
          modal.show();
        }

        //  this.router.navigate(['/dashboard/loan']);

      } else {
        this.toastr.warning(
          res?.message || 'Penny drop verification failed'
        );
      }
    },
    error: () => {
      this.spinner.hide();
      this.isSubmitting = false;
      this.toastr.error('Penny drop failed');
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
}
