import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CalculatorComponent } from './calculator/calculator.component';
import { EmploymentComponent } from './employment/employment.component';
import { EkycComponent } from './ekyc/ekyc.component';
import { BankComponent } from './bank/bank.component';
import { DocumentsComponent } from './documents/documents.component';
import { DisbursalComponent } from './disbursal/disbursal.component';

const routes: Routes = [
  { path: 'calculator', component: CalculatorComponent },
  { path: 'employment', component: EmploymentComponent },
  { path: 'ekyc', component: EkycComponent },
  { path: 'bank', component: BankComponent },
  { path: 'documents', component: DocumentsComponent },
  { path: 'disbursal', component: DisbursalComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LoanRoutingModule { }
