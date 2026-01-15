import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ContentService } from '../../../service/content.service';
@Component({
  selector: 'app-pan',
  templateUrl: './pan.component.html',
  styleUrl: './pan.component.css',
})
export class PanComponent {
  panNumber: any;
  showModal = false;
  panData: any;
  isLoading = false;
  basicForm: any;
  isMarried: any;

  constructor(
    private ContentService: ContentService,
    private router: Router,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.basicForm = this.fb.group({
      name: ['', Validators.required],
      dob: ['', Validators.required],
      gender: ['', Validators.required],
      maritalStatus: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      spouseName: [''],
      spouseOccupation: [''],
      userId: ['3fa85f64-5717-4562-b3fc-2c963f66afa6'],
    });

    this.patchPanDataIfAvailable();
    this.watchMaritalStatus();
  }

  patchPanDataIfAvailable() {
    const panRaw = localStorage.getItem('panBasicData');
    if (!panRaw) return;

    const pan = JSON.parse(panRaw);

    if (!pan?.isValid) return;

    this.basicForm.patchValue({
      name: pan.fullName || '',
      dob: pan.dob || '',
      gender: this.mapGender(pan.gender),
    });
  }

  mapGender(panGender: string): string {
    if (!panGender) return '';
    return panGender.toLowerCase() === 'male' ? 'MALE' : 'FEMALE';
  }

  watchMaritalStatus() {
    this.basicForm
      .get('maritalStatus')
      ?.valueChanges.subscribe((value: string) => {
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

  previewPan() {
    if (this.panNumber.length !== 10) {
      alert('Enter valid PAN number');
      return;
    }

    const payload = {
      pan: this.panNumber.toUpperCase(),
    };

    this.ContentService.previewPan(payload).subscribe({
      next: (res: any) => {
        if (!res?.success) {
          alert('PAN verification failed');
          return;
        }

        // ✅ store preview data
        this.panData = res.data;

        // ✅ open modal
        this.showModal = true;

        // ✅ store PAN preview for next screen
        localStorage.setItem('panPreviewData', JSON.stringify(res.data));

        this.showModal = true;
      },
      error: () => {
        alert('Server error while verifying PAN');
      },
    });
  }

  closeModal() {
    this.showModal = false;
  }
  // 🔹 STEP 2: VERIFY PAN (FINAL)
  confirmPan() {
    if (this.isLoading) return;

    this.isLoading = true;

    const payload = {
      panNumber: this.panNumber.toUpperCase(),
      consent: true,
    };

    this.ContentService.verifyPan(payload).subscribe({
      next: (res: any) => {
        this.isLoading = false;

        if (!res?.success) {
          alert('PAN verification failed');
          return;
        }

        // ✅ PAN VERIFIED → NEXT STEP
        this.showModal = false;
        // 🚀 redirect to basic info
        this.router.navigate(['/dashboard/profile/basic-info']);
      },
      error: () => {
        this.isLoading = false;
        alert('PAN verification error');
      },
    });
  }
}
