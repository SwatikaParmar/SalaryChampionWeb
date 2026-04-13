import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-check-eligibility-error',
  templateUrl: './check-eligibility-error.component.html',
  styleUrl: './check-eligibility-error.component.css'
})
export class CheckEligibilityErrorComponent implements OnInit {
  message = '';

  ngOnInit(): void {
    this.message = history.state?.message || '';
  }
}
