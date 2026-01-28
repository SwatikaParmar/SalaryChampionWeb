import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ContentService } from '../../../service/content.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
@Component({
  selector: 'app-income',
  templateUrl: './income.component.html',
  styleUrl: './income.component.css',
})
export class IncomeComponent implements OnInit {
  incomeForm!: FormGroup;
  minSalaryDate!: string;

  constructor(
    private fb: FormBuilder,
    private contentService: ContentService,
    private router: Router,
    private spinner: NgxSpinnerService, // ✅ spinner
    private toastr: ToastrService, // ✅ toaster
  ) {}

  ngOnInit(): void {
    const today = new Date();
    this.minSalaryDate = today.toISOString().split('T')[0];
    this.incomeForm = this.fb.group({
      employmentType: ['SALARIED', Validators.required],
      netMonthlyIncome: ['', [Validators.required, Validators.min(1)]],
      nextSalaryDate: ['', Validators.required],
      modeOfIncome: ['SALARY', Validators.required],
      existingEmiTotal: ['', [Validators.required, Validators.min(0)]],
    });

    // 🔥 IMPORTANT: default selection logic
    this.setEmploymentType('SALARIED');

    // 🔥 Load existing employment (if any)
    this.getBorrowerSnapshot();
  }

  submit() {
    if (this.incomeForm.invalid) {
      this.incomeForm.markAllAsTouched();
      this.toastr.warning('Please fill all required income details');
      return;
    }

    const payload = this.incomeForm.value;

    this.spinner.show();

    this.contentService.saveIncomeDetail(payload).subscribe({
      next: (res: any) => {
        this.spinner.hide();

        if (res?.success) {
          this.toastr.success('Income details saved successfully');
          this.router.navigate(['/dashboard/profile/selfie']); // next step
        } else {
          this.toastr.error(res?.message || 'Failed to save income details');
        }
      },
      error: () => {
        this.spinner.hide();
        this.toastr.error('Failed to save income details');
      },
    });
  }

setEmploymentType(type?: string) {
  const finalType = type || 'SALARIED';

  this.incomeForm.patchValue({ employmentType: finalType });

  const salaryDateCtrl = this.incomeForm.get('nextSalaryDate');

  if (finalType === 'SALARIED') {
    salaryDateCtrl?.setValidators(Validators.required);
    salaryDateCtrl?.enable();
  } else {
    salaryDateCtrl?.clearValidators();
    salaryDateCtrl?.reset();
    salaryDateCtrl?.disable();
  }

  salaryDateCtrl?.updateValueAndValidity();
}


  getBorrowerSnapshot() {
    this.contentService.getBorrowerSnapshot().subscribe({
      next: (res: any) => {
        if (res?.success && res?.data?.employment) {
          this.patchEmploymentData(res.data.employment);
        }
      },
      error: () => {
        console.error('Failed to fetch borrower snapshot');
      },
    });
  }

  patchEmploymentData(employment: any) {
    const type = employment?.employmentType || 'SALARIED';

    this.incomeForm.patchValue({
      employmentType: type,
      netMonthlyIncome: employment?.netMonthlyIncome || '',
      nextSalaryDate: employment?.nextSalaryDate || '',
      modeOfIncome: employment?.modeOfIncome || 'BANK_TRANSFER',
      existingEmiTotal: employment?.existingEmiTotal ?? '',
    });

    // ✅ ALWAYS pass a valid type
    this.setEmploymentType(type);
  }
}
