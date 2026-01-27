import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { BankComponent } from './bank/bank.component';
import { CalculatorComponent } from './calculator/calculator.component';
import { DisbursalComponent } from './disbursal/disbursal.component';
import { DocumentsComponent } from './documents/documents.component';
import { EkycComponent } from './ekyc/ekyc.component';
import { EmploymentComponent } from './employment/employment.component';
import { LoanApplicationHomeComponent } from './loan-application-home/loan-application-home.component';
import { LoanRoutingModule } from './loan-routing.module';
import { ReactiveFormsModule } from '@angular/forms';
import { SafeUrlPipe } from './ekyc/safe-url.pipe';
import { EKYCVerificationComponent } from './ekyc/e-kyc-verification/e-kyc-verification.component';
import { BankVerificationComponent } from './bank/bank-verification/bank-verification.component';
import { SalarySlipComponent } from './documents/salary-slip/salary-slip.component';
import { RefrenceComponent } from './refrence/refrence.component';
import { BankStatementComponent } from './documents/bank-statement/bank-statement.component';
import { EKycErrorComponent } from './ekyc/e-kyc-error/e-kyc-error.component';
import { ErrorVerificationComponent } from './bank/error-verification/error-verification.component';
import { SummaryComponent } from './summary/summary.component';
@NgModule({
  declarations: [
    CalculatorComponent,
    EmploymentComponent,
    EkycComponent,
    BankComponent,
    DocumentsComponent,
    DisbursalComponent,
    LoanApplicationHomeComponent,
    SafeUrlPipe,
    EKYCVerificationComponent,
    BankVerificationComponent,
    SalarySlipComponent,
    RefrenceComponent,
    BankStatementComponent,
    EKycErrorComponent,
    ErrorVerificationComponent,
    SummaryComponent
  ],
  imports: [CommonModule, LoanRoutingModule, FormsModule,ReactiveFormsModule],
})
export class LoanModule {}
