import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BankVerificationComponent } from './bank/bank-verification/bank-verification.component';
import { BankComponent } from './bank/bank.component';
import { CalculatorComponent } from './calculator/calculator.component';
import { DisbursalComponent } from './disbursal/disbursal.component';
import { DocumentsComponent } from './documents/documents.component';
import { SalarySlipComponent } from './documents/salary-slip/salary-slip.component';
import { EKYCVerificationComponent } from './ekyc/e-kyc-verification/e-kyc-verification.component';
import { EkycComponent } from './ekyc/ekyc.component';
import { EmploymentComponent } from './employment/employment.component';
import { LoanApplicationHomeComponent } from './loan-application-home/loan-application-home.component';
import { RefrenceComponent } from './refrence/refrence.component';
import { BankStatementComponent } from './documents/bank-statement/bank-statement.component';
const routes: Routes = [
  { path: '', component: LoanApplicationHomeComponent },
  { path: 'calculator', component: CalculatorComponent },
  { path: 'employment', component: EmploymentComponent },
  { path: 'ekyc', component: EkycComponent },
  { path: 'bank', component: BankComponent },
  { path: 'documents', component: DocumentsComponent },
  { path: 'disbursal', component: DisbursalComponent },
  { path: 'ekyc-verification', component: EKYCVerificationComponent },
  { path: 'bank-verification', component: BankVerificationComponent },
  { path: ' salary-slip', component: SalarySlipComponent },
  { path: 'reference', component: RefrenceComponent },
  { path: 'bank-statement', component:BankStatementComponent}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LoanRoutingModule {}
