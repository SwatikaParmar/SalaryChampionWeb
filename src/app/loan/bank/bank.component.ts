import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ContentService } from '../../../service/content.service';
@Component({
  selector: 'app-bank',
  templateUrl: './bank.component.html',
  styleUrl: './bank.component.css'
})
export class BankComponent {
  applicationId: any;


    constructor(
    private fb: FormBuilder,
    private contentService: ContentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.getBorrowerSnapshot();
  }


    // ================= GET & PATCH =================
getBorrowerSnapshot() {
  this.contentService.getBorrowerSnapshot().subscribe({
    next: (res: any) => {
      if (!res?.success) return;

      this.applicationId = res.data.application?.id;

      // if (this.applicationId) {
      //   this.fetchBankStatement();
      // }
    },
    error: () => console.error('Failed to fetch borrower snapshot'),
  });
}


fetchBankStatement() {
  const payload = {
    applicationId: this.applicationId
  };

  this.contentService.fetchBankStatement(payload).subscribe({
    next: (res: any) => {
      if (res?.success && res?.data?.url) {
        // ✅ SAME TAB redirect
        window.location.href = res.data.url;
      }
    },
    error: () => {
      console.error('Failed to fetch bank statement');
    }
  });
}




}
