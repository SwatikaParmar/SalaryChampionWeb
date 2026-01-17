import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  loanAmount = 100000; // ₹10,000 – ₹5,00,000
  tenure = 24; // months
  interestRate = 16.5; // annual %

  emi = 0;
  totalInterest = 0;
  totalPayment = 0;

  ngOnInit(): void {
    this.calculateEMI();
  }

  calculateEMI() {
    const P = this.loanAmount;
    const R = this.interestRate / 12 / 100;
    const N = this.tenure;

    if (R === 0) {
      this.emi = P / N;
    } else {
      this.emi = (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1);
    }

    this.totalPayment = this.emi * N;
    this.totalInterest = this.totalPayment - P;
  }
}
