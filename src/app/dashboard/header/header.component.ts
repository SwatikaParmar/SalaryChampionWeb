import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { ContentService } from '../../../service/content.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit {
  @Output() sidebarToggle = new EventEmitter<void>();
  user: any = null;
  private readonly fallbackPalette = [
    { start: '#f97316', end: '#fb7185' },
    { start: '#2563eb', end: '#06b6d4' },
    { start: '#16a34a', end: '#14b8a6' },
    { start: '#7c3aed', end: '#ec4899' },
  ];

  constructor(private contentService: ContentService) {}

  ngOnInit(): void {
    this.getBorrowerSnapshot();
  }

  getBorrowerSnapshot() {
    this.contentService.getBorrowerSnapshot().subscribe({
      next: (res: any) => {
        if (!res?.success) return;

        // ✅ THIS IS MISSING LINE
        this.user = res.data.user;
      },
      error: () => console.error('Failed to fetch borrower snapshot'),
    });
  }

  /* ===============================
     GETTERS FOR TEMPLATE
  =============================== */
  get userName(): string {
    return this.user?.name?.trim() || 'User';
  }

  get profileImage(): string {
    return this.user?.profilePicUrl?.trim()
      ? this.user.profilePicUrl
      : this.buildProfilePlaceholder();
  }

  onImageError(event: Event) {
    (event.target as HTMLImageElement).src = this.buildProfilePlaceholder();
  }

  toggleSidebar(): void {
    this.sidebarToggle.emit();
  }

  private buildProfilePlaceholder(): string {
    const name = this.userName;
    const initials = name
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
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
        <defs>
          <linearGradient id="avatar-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${palette.start}" />
            <stop offset="100%" stop-color="${palette.end}" />
          </linearGradient>
        </defs>
        <rect width="72" height="72" rx="36" fill="url(#avatar-gradient)" />
        <text
          x="36"
          y="42"
          text-anchor="middle"
          font-size="26"
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
