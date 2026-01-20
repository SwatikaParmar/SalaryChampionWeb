import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContentService } from '../../../service/content.service';

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

  constructor(private contentService: ContentService, private router: Router) {}

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
  this.contentService.checkEligibility().subscribe({
    next: (res) => {
      /**
       * Example response:
       * { success: true }
       * { success: false, message: 'Not eligible' }
       */
debugger
      if (res?.success === true) {
        this.router.navigate(
          ['/dashboard/success-eligibility']
        );
      } else {
        this.router.navigate(
          ['/dashboard/error-eligibility'],
          { state: { message: res?.message } }
        );
      }
    },

    error: () => {
      // server / network error
      this.router.navigate(
        ['/dashboard/error-eligibility'],
        { state: { message: 'Something went wrong' } }
      );
    }
  });
}

}
