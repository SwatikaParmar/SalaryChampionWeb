import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PanComponent } from './pan/pan.component';
import { BasicInfoComponent } from './basic-info/basic-info.component';
import { AddressComponent } from './address/address.component';
import { IncomeComponent } from './income/income.component';
import { SelfieComponent } from './selfie/selfie.component';
import { PreviewComponent } from './preview/preview.component';
import { ProfileHomeComponent } from './profile-home/profile-home.component';
import { CheckEligibilityErrorComponent } from './check-eligibility-error/check-eligibility-error.component';
import { CheckEligibilitySuccessComponent } from './check-eligibility-success/check-eligibility-success.component';
import { LoanHistoryComponent } from './loan-history/loan-history.component';
import { LoanDetailComponent } from './loan-detail/loan-detail.component';
import { LoanRepayComponent } from './loan-repay/loan-repay.component';
import { PrivacyComponent } from './privacy/privacy.component';
import { ProfileTermsAndConditionsComponent } from './terms-and-conditions/terms-and-conditions.component';

// profile-routing.module.ts
const routes: Routes = [
  { path: '', component: ProfileHomeComponent },
  { path: 'pan', component: PanComponent },
  { path: 'basic-info', component: BasicInfoComponent },
  { path: 'address', component: AddressComponent },
  { path: 'income', component: IncomeComponent },
  { path: 'selfie', component: SelfieComponent },
  { path: 'preview', component: PreviewComponent },
  { path: 'success-eligibility', component:CheckEligibilitySuccessComponent},
  { path: 'error-eligibility', component:CheckEligibilityErrorComponent},
  { path: 'loan-history', component:LoanHistoryComponent},
  { path: 'loan-detail/:id', component:LoanDetailComponent},
  { path: 'loan-repay/:id', component:LoanRepayComponent},
  { path: 'privacy', component:PrivacyComponent},
  { path: 'terms-and-conditions', component: ProfileTermsAndConditionsComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProfileRoutingModule { }
