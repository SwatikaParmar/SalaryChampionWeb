import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ContentService } from '../../../service/content.service';

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
    private router: Router
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
    // 🔥 Load existing employment (if any)
    this.getBorrowerSnapshot();
  }

  submit() {
    if (this.incomeForm.invalid) {
      this.incomeForm.markAllAsTouched();
      return;
    }

    const payload = this.incomeForm.value;

    this.contentService.saveIncomeDetail(payload).subscribe({
      next: () => {
        this.router.navigate(['/dashboard/profile/selfie']); // or next step
      },
      error: () => {
        console.error('Failed to save income details');
      },
    });
  }

  setEmploymentType(type: string) {
    this.incomeForm.patchValue({ employmentType: type });

    const salaryDateCtrl = this.incomeForm.get('nextSalaryDate');

    if (type === 'SALARIED') {
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
    this.incomeForm.patchValue({
      employmentType: employment.employmentType || 'SALARIED',
      netMonthlyIncome: employment.netMonthlyIncome || '',
      nextSalaryDate: employment.nextSalaryDate || '',
      modeOfIncome: employment.modeOfIncome || 'SALARY',
      existingEmiTotal: employment.existingEmiTotal ?? '',
    });

    // 🔁 Apply salary date enable/disable logic
    this.setEmploymentType(employment.employmentType);
  }
}
