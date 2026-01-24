import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ContentService } from '../../../service/content.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';

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
    private spinner: NgxSpinnerService,   // ✅ spinner
    private toastr: ToastrService         // ✅ toaster
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
        [Validators.required, this.accountNumberValidator.bind(this)]
      ],
      ifsc: [
        '',
        [Validators.required, Validators.pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)]
      ],
      holderName: ['', Validators.required],
      mobile: [
        '',
        [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]
      ],
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

    const payload = {
      applicationId: this.applicationId,
      id: this.id || '',
      ...this.disbursalForm.getRawValue(), // ✅ include masked value
    };

    this.contentService.disbursalBankAccount(payload).subscribe({
      next: (res: any) => {
        this.spinner.hide();
        this.isSubmitting = false;

        if (!res?.success) {
          this.toastr.error('Failed to save bank details');
          return;
        }

        this.toastr.success('Bank details saved successfully ✅');
        // 🔥 navigate next step if needed
      },
      error: () => {
        this.spinner.hide();
        this.isSubmitting = false;
        this.toastr.error('Something went wrong');
      },
    });
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
