import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContentService } from '../../../service/content.service';
import { PROFILE_STEPS } from './profile-steps';
@Component({
  selector: 'app-profile-home',
  templateUrl: './profile-home.component.html',
  styleUrl: './profile-home.component.css',
})
export class ProfileHomeComponent implements OnInit {
  steps = PROFILE_STEPS;
  stepStatus: any = {};
  progress = 0;

  constructor(private contentService: ContentService, private router: Router) {}

  ngOnInit(): void {
    this.getBorrowerSnapshot();
  }

  // 🔥 API HIT
  getBorrowerSnapshot() {
    this.contentService.getBorrowerSnapshot().subscribe({
      next: (res: any) => {
        if (res?.success && res?.data?.basicFlow) {
          this.stepStatus = res.data.basicFlow.steps;
          this.progress = res.data.basicFlow.percent;
        }
      },
      error: () => console.error('Failed to fetch borrower snapshot'),
    });
  }

  // ✅ Step completed?
  isCompleted(stepKey: string): boolean {
    return this.stepStatus?.[stepKey] === true;
  }

  // 🚫 Can user open this step?
  canOpen(index: number): boolean {
    if (index === 0) return true; // first step always allowed

    const prevKey = this.steps[index - 1].key;
    return this.stepStatus?.[prevKey] === true;
  }

  // 👉 Safe navigation
  go(step: any, index: number) {
    if (!this.canOpen(index)) return;
    this.router.navigate([step.route]);
  }
}
