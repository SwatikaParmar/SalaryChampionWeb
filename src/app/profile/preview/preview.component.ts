import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContentService } from '../../../service/content.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';

type PreviewTab = 'BASIC' | 'ADDRESS' | 'INCOME';

@Component({
  selector: 'app-preview',
  templateUrl: './preview.component.html',
  styleUrls: ['./preview.component.css'],
})
export class PreviewComponent implements OnInit {
  selectedTab: PreviewTab = 'BASIC';

  user: any;
  address: any;
  employment: any;
  profilePic: string | null = null;
  hasEvaluatedEligibilityOnce = false; 
  constructor(
    private contentService: ContentService,
    private router: Router,
    private spinner: NgxSpinnerService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.getBorrowerSnapshot();
  }

  getBorrowerSnapshot() {
    this.contentService.getBorrowerSnapshot().subscribe({
      next: (res: any) => {
        if (!res?.success) return;
        const data = res.data;
        this.user = data.user;
        this.address = data.addresses?.[0];
        this.employment = data.employment;
        this.profilePic = data.user?.profilePicUrl;

        // 🔥 eligibility flag
        this.hasEvaluatedEligibilityOnce =
          data.offer?.hasEvaluatedEligibilityOnce === true;
      },
    });
  }

  selectTab(tab: PreviewTab) {
    this.selectedTab = tab;
  }

  editCurrentTab() {
    if (this.selectedTab === 'BASIC') {
      this.router.navigate(['/dashboard/profile/basic-info']);
    }
    if (this.selectedTab === 'ADDRESS') {
      this.router.navigate(['/dashboard/profile/address']);
    }
    if (this.selectedTab === 'INCOME') {
      this.router.navigate(['/dashboard/profile/income']);
    }
  }

  checkEligibility() {
    // ✅ START spinner
    this.spinner.show();

    this.contentService.checkEligibility().subscribe({
      next: (res) => {
        // ✅ STOP spinner
        this.spinner.hide();

        if (res?.success === true) {
          this.router.navigate(['/dashboard/profile/success-eligibility']);
        } else {
          this.router.navigate(['/dashboard/profile/error-eligibility'], {
            state: { message: res?.message || 'Not eligible' },
          });
        }
      },

      error: () => {
        // ✅ STOP spinner
        this.spinner.hide();
        this.router.navigate(['/dashboard/profile/error-eligibility'], {
          state: { message: 'Something went wrong' },
        });
      },
    });
  }
}
