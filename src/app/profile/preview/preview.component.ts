import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContentService } from '../../../service/content.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { getFirstApiErrorMessage } from '../../../service/api-error.util';

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
  profileImageSrc: string | null = null;
  isProfileImageLoading = true;
  hasEvaluatedEligibilityOnce = false;
  private readonly fallbackPalette = [
    { start: '#f97316', end: '#fb7185' },
    { start: '#2563eb', end: '#06b6d4' },
    { start: '#16a34a', end: '#14b8a6' },
    { start: '#7c3aed', end: '#ec4899' },
  ];

  constructor(
    private contentService: ContentService,
    private router: Router,
    private spinner: NgxSpinnerService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.getBorrowerSnapshot();
  }

  getBorrowerSnapshot(): void {
    this.isProfileImageLoading = true;

    this.contentService.getBorrowerSnapshot().subscribe({
      next: (res: any) => {
        if (!res?.success) {
          this.setProfileImageSource(null);
          return;
        }

        const data = res.data;
        this.user = data.user;
        this.address = data.addresses?.[0];
        this.employment = data.employment;
        this.profilePic = data.user?.profilePicUrl ?? null;
        this.hasEvaluatedEligibilityOnce =
          data.offer?.hasEvaluatedEligibilityOnce === true;

        this.setProfileImageSource(this.profilePic);
      },
      error: () => {
        this.setProfileImageSource(null);
      },
    });
  }

  onProfileImageLoad(): void {
    this.isProfileImageLoading = false;
  }

  onProfileImageError(): void {
    const fallbackImage = this.buildProfilePlaceholder();

    if (this.profileImageSrc !== fallbackImage) {
      this.profileImageSrc = fallbackImage;
      return;
    }

    this.isProfileImageLoading = false;
  }

  selectTab(tab: PreviewTab): void {
    this.selectedTab = tab;
  }

  editCurrentTab(): void {
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

  checkEligibility(): void {
    this.spinner.show();

    this.contentService.checkEligibility().subscribe({
      next: (res) => {
        this.spinner.hide();

        if (res?.success === true) {
          this.router.navigate(['/dashboard/profile/success-eligibility']);
        } else {
          this.router.navigate(['/dashboard/profile/error-eligibility'], {
            state: { message: getFirstApiErrorMessage(res, 'Not eligible') },
          });
        }
      },
      error: (err) => {
        this.spinner.hide();
        this.router.navigate(['/dashboard/profile/error-eligibility'], {
          state: {
            message: getFirstApiErrorMessage(err, 'Something went wrong'),
          },
        });
      },
    });
  }

  private setProfileImageSource(imageUrl: string | null | undefined): void {
    const resolvedImage =
      typeof imageUrl === 'string' && imageUrl.trim()
        ? imageUrl
        : this.buildProfilePlaceholder();

    this.isProfileImageLoading = true;
    this.profileImageSrc = resolvedImage;
  }

  private buildProfilePlaceholder(): string {
    const name = this.user?.name?.trim() || 'User';
    const initials =
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part: string) => part.charAt(0).toUpperCase())
        .join('') || 'U';
    const colorSeed = [...name].reduce(
      (total, char) => total + char.charCodeAt(0),
      0
    );
    const palette =
      this.fallbackPalette[colorSeed % this.fallbackPalette.length];
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
        <defs>
          <linearGradient id="preview-avatar-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${palette.start}" />
            <stop offset="100%" stop-color="${palette.end}" />
          </linearGradient>
        </defs>
        <rect width="120" height="120" rx="60" fill="url(#preview-avatar-gradient)" />
        <text
          x="60"
          y="72"
          text-anchor="middle"
          font-size="38"
          font-family="Arial, sans-serif"
          font-weight="700"
          fill="#ffffff"
        >
          ${initials}
        </text>
      </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }
}
