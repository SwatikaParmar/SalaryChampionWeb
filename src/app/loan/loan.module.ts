import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LoanRoutingModule } from './loan-routing.module';
import { CalculatorComponent } from './calculator/calculator.component';
import { EmploymentComponent } from './employment/employment.component';
import { EkycComponent } from './ekyc/ekyc.component';
import { BankComponent } from './bank/bank.component';
import { DocumentsComponent } from './documents/documents.component';
import { DisbursalComponent } from './disbursal/disbursal.component';


@NgModule({
  declarations: [
    CalculatorComponent,
    EmploymentComponent,
    EkycComponent,
    BankComponent,
    DocumentsComponent,
    DisbursalComponent
  ],
  imports: [
    CommonModule,
    LoanRoutingModule
  ]
})
export class LoanModule { }
