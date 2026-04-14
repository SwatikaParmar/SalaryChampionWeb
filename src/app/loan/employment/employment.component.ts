import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ContentService } from '../../../service/content.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { getFirstApiErrorMessage } from '../../../service/api-error.util';

@Component({
  selector: 'app-employment',
  templateUrl: './employment.component.html',
  styleUrl: './employment.component.css',
})
export class EmploymentComponent implements OnInit {
  employmentForm!: FormGroup;
  applicationId = '';
  submitted = false;
  maxJoiningDate!: string;
  today!: string;

  constructor(
    private fb: FormBuilder,
    private contentService: ContentService,
    private router: Router,
    private spinner: NgxSpinnerService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    const today = new Date();
    this.maxJoiningDate = today.toISOString().split('T')[0];
    this.initForm();
    this.getBorrowerSnapshot();
    const now = new Date();
    this.today = now.toISOString().split('T')[0];
  }

  // ================= FORM INIT =================
  initForm() {
    this.employmentForm = this.fb.group({
      workingFromHome: [false, Validators.required],

      companyName: ['', [Validators.required, Validators.minLength(2)]],
      companyType: ['', Validators.required],
      designation: ['', [Validators.required, Validators.minLength(2)]],


      dateOfJoining: ['', Validators.required],
      nextSalaryDate: ['', Validators.required],

      monthlyIncome: ['', [Validators.required, Validators.min(1)]],
      address: this.fb.group({
        line1: ['', Validators.required],
        line2: [''],
        landmark: ['', Validators.required],
        pincode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
        state: [{ value: '', disabled: true }],
        city: [''],
      }),
    });
  }

  // ================= GET & PATCH =================
  getBorrowerSnapshot() {
    this.contentService.getBorrowerSnapshot().subscribe({
      next: (res: any) => {
        if (!res?.success) return;

        this.applicationId = res.data.application?.id;

        const emp = res.data.employment;
        const addr = res.data.addresses?.[0];
      },
      error: () => console.error('Failed to fetch borrower snapshot'),
    });
  }

  // ================= SAVE =================
  save() {
    this.submitted = true;
    // Force validation
    this.employmentForm.markAllAsTouched();
    if (this.employmentForm.invalid) return;

    const payload = {
      applicationId: this.applicationId,
      employmentType: 'SALARIED',
      ...this.employmentForm.getRawValue(),
    };

    // ✅ SHOW SPINNER
    this.spinner.show();

    this.contentService.postEmploymentDetail(payload).subscribe({
      next: (res: any) => {
        this.spinner.hide(); // ✅ HIDE SPINNER

        if (res?.success) {
          this.router.navigateByUrl('/dashboard/loan/ekyc');
          return;
        }

        this.toastr.error(
          getFirstApiErrorMessage(res, 'Failed to save employment details'),
        );
      },
      error: (err) => {
        this.spinner.hide(); // ✅ ALWAYS HIDE
        this.toastr.error(
          getFirstApiErrorMessage(err, 'Failed to save employment details'),
        );
      },
    });
  }

  blockFutureTyping(event: KeyboardEvent) {
    // allow navigation + backspace
    const allowedKeys = [
      'Backspace',
      'Tab',
      'ArrowLeft',
      'ArrowRight',
      'Delete',
    ];

    if (allowedKeys.includes(event.key)) return;

    // prevent manual typing
    event.preventDefault();
  }

  // ================= HELPERS =================
  get f() {
    return this.employmentForm.controls;
  }

  get addr() {
    return (this.employmentForm.get('address') as FormGroup).controls;
  }

  get workingFromHomeCtrl() {
    return this.employmentForm.get('workingFromHome');
  }

  get workEmailCtrl() {
    return this.employmentForm.get('workEmail');
  }

  get companyNameCtrl() {
    return this.employmentForm.get('companyName');
  }

  get companyTypeCtrl() {
    return this.employmentForm.get('companyType');
  }

  get designationCtrl() {
    return this.employmentForm.get('designation');
  }

  get addressGroup() {
    return this.employmentForm.get('address');
  }

  onPincodeChange() {
    const addressGroup = this.employmentForm.get('address') as FormGroup;

    const pincodeCtrl = addressGroup.get('pincode');
    const cityCtrl = addressGroup.get('city');
    const stateCtrl = addressGroup.get('state');

    const pincode = pincodeCtrl?.value;

    // 🔹 default locked state
    cityCtrl?.disable({ emitEvent: false });
    stateCtrl?.disable({ emitEvent: false });

    // ❌ invalid pincode
    if (!pincode || pincode.length !== 6) {
      cityCtrl?.reset();
      stateCtrl?.reset();
      return;
    }

    this.contentService.resolvePincode(pincode).subscribe({
      next: (res: any) => {
        if (res?.success && res?.data) {
          // ✅ STATE (always)
          stateCtrl?.enable({ emitEvent: false });
          stateCtrl?.setValue(res.data.stateName);
          stateCtrl?.disable({ emitEvent: false });

          // ✅ CITY
          if (res.data.city) {
            cityCtrl?.enable({ emitEvent: false });
            cityCtrl?.setValue(res.data.city);
            cityCtrl?.disable({ emitEvent: false });
          } else {
            cityCtrl?.reset();
            cityCtrl?.enable(); // manual entry allowed
          }
        }
      },
      error: () => {
        cityCtrl?.enable();
        stateCtrl?.disable();
        console.error('Pincode resolve failed');
      },
    });
  }

  blockTyping(event: KeyboardEvent) {
    const allowed = ['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete'];

    if (allowed.includes(event.key)) return;

    event.preventDefault();
  }
}
