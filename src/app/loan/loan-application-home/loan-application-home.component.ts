import { Component } from '@angular/core';

@Component({
  selector: 'app-loan-application-home',
  templateUrl: './loan-application-home.component.html',
  styleUrl: './loan-application-home.component.css',
})
export class LoanApplicationHomeComponent {
  currentStep = 1;

  goToStep(step: number) {
    this.currentStep = step;
  }
}
