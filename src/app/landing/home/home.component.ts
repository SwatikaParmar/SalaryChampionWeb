import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  isMenuOpen = false;

  readonly minLoanAmount = 7000;
  readonly maxLoanAmount = 100000;
  readonly loanAmountStep = 500;

  loanAmount = 50000;
  tenure = 15; // days

  interestRate = 1; // 1% daily
  processingFeeRate = 10; // %
  gstRate = 18; // %

  interest = 0;
  processingFee = 0;
  gst = 0;
  totalPayment = 0;

  ngOnInit(): void {
    this.calculateLoan();
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  calculateLoan() {

    const P = this.loanAmount;
    const days = this.tenure;

    // 🔥 Interest (daily)
    this.interest = (P * this.interestRate / 100) * days;

    // 🔥 Processing Fee
    this.processingFee = (P * this.processingFeeRate) / 100;

    // 🔥 GST on PF
    this.gst = (this.processingFee * this.gstRate) / 100;

    // 🔥 Total
    this.totalPayment = P + this.interest + this.processingFee + this.gst;

  }
}
