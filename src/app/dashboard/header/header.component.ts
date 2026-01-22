import { Component, OnInit } from '@angular/core';
import { ContentService } from '../../../service/content.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit {
  user: any = null;

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
      : 'assets/images/c1_1.webp';
  }

  onImageError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/images/c1_1.webp';
  }
}
