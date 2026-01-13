import { Component } from '@angular/core';
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

  constructor(private ContentService: ContentService, private router: Router) {}

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

        // optional: save PAN status
        localStorage.setItem('panVerified', 'true');

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
