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
@NgModule({
  declarations: [
    CalculatorComponent,
    EmploymentComponent,
    EkycComponent,
    BankComponent,
    DocumentsComponent,
    DisbursalComponent,
    LoanApplicationHomeComponent,
    SafeUrlPipe
  ],
  imports: [CommonModule, LoanRoutingModule, FormsModule,ReactiveFormsModule],
})
export class LoanModule {}
