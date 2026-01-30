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

  constructor(
    private contentService: ContentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.getBorrowerSnapshot();
  }

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

  // 🚫 Can open ONLY if:
  // - previous step completed
  // - current step NOT completed
  canOpen(index: number): boolean {
    if (index === 0) {
      return !this.isCompleted(this.steps[0].key);
    }

    const prevKey = this.steps[index - 1].key;
    const currKey = this.steps[index].key;

    return (
      this.stepStatus?.[prevKey] === true &&
      this.stepStatus?.[currKey] !== true
    );
  }

  // 👉 Navigation (final guard)
  go(step: any, index: number) {
    if (!this.canOpen(index)) return;
    this.router.navigate([step.route]);
  }
}
