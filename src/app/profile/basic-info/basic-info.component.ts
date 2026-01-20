import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ContentService } from '../../../service/content.service';

@Component({
  selector: 'app-basic-info',
  templateUrl: './basic-info.component.html',
  styleUrl: './basic-info.component.css',
})
export class BasicInfoComponent implements OnInit {
  basicForm!: FormGroup;
  isMarried = false;

  constructor(
    private fb: FormBuilder,
    private contentService: ContentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.basicForm = this.fb.group({
      name: [{ value: '', disabled: false }, Validators.required],
      dob: [{ value: '', disabled: false }, Validators.required],
      gender: [{ value: '', disabled: false }, Validators.required],
      maritalStatus: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      spouseName: [''],
      spouseOccupation: [''],
    });

    this.getBorrowerSnapshot();
    this.watchMaritalStatus();
  }

  // 🔥 MAIN SOURCE OF DATA
  getBorrowerSnapshot() {
    this.contentService.getBorrowerSnapshot().subscribe({
      next: (res: any) => {
        if (res?.success && res?.data?.user) {
          this.patchBorrowerData(res.data.user);
        }
      },
      error: () => {
        console.error('Failed to fetch borrower snapshot');
      },
    });
  }

  // 🔐 PATCH + LOCK PAN VERIFIED DATA
  patchBorrowerData(user: any) {
    debugger
  // Ensure YYYY-MM-DD
  const formattedDob = user.dob.split('T')[0];

  this.basicForm.patchValue({
    dob: formattedDob
  });
    this.basicForm.patchValue({
      name: user.name,
      gender: user.gender,
      maritalStatus: user.maritalStatus,
      email: user.email,
      spouseName: user.spouseName,
      spouseOccupation: user.spouseOccupation,
    });

    // 🔒 Lock PAN verified fields
    if (user.pan?.isValid) {
      this.basicForm.get('name')?.disable();
      this.basicForm.get('dob')?.disable();
      this.basicForm.get('gender')?.disable();
    }

    this.isMarried = user.maritalStatus === 'MARRIED';
  }

  watchMaritalStatus() {
    this.basicForm.get('maritalStatus')?.valueChanges.subscribe((value) => {
      this.isMarried = value === 'MARRIED';

      if (this.isMarried) {
        this.basicForm.get('spouseName')?.setValidators(Validators.required);
        this.basicForm
          .get('spouseOccupation')
          ?.setValidators(Validators.required);
      } else {
        this.basicForm.patchValue({
          spouseName: '',
          spouseOccupation: '',
        });
        this.basicForm.get('spouseName')?.clearValidators();
        this.basicForm.get('spouseOccupation')?.clearValidators();
      }

      this.basicForm.get('spouseName')?.updateValueAndValidity();
      this.basicForm.get('spouseOccupation')?.updateValueAndValidity();
    });
  }

  submit() {
    if (this.basicForm.invalid) {
      this.basicForm.markAllAsTouched();
      return;
    }

    // ✅ Include disabled fields
    const payload = this.basicForm.getRawValue();

    this.contentService.saveBasicDetail(payload).subscribe({
      next: () => {
        this.router.navigate(['/dashboard/profile/address']);
      },
      error: () => {
        console.error('Failed to save basic details');
      },
    });
  }
}
