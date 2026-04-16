import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AddressComponent } from './address/address.component';
import { BasicInfoComponent } from './basic-info/basic-info.component';
import { IncomeComponent } from './income/income.component';
import { PanComponent } from './pan/pan.component';
import { PreviewComponent } from './preview/preview.component';
import { ProfileHomeComponent } from './profile-home/profile-home.component';
import { ProfileRoutingModule } from './profile-routing.module';
import { SelfieComponent } from './selfie/selfie.component';
import { CheckEligibilityErrorComponent } from './check-eligibility-error/check-eligibility-error.component';
import { CheckEligibilitySuccessComponent } from './check-eligibility-success/check-eligibility-success.component';
import { LoanHistoryComponent } from './loan-history/loan-history.component';
import { LoanDetailComponent } from './loan-detail/loan-detail.component';
import { LoanRepayComponent } from './loan-repay/loan-repay.component';
import { PrivacyComponent } from './privacy/privacy.component';

@NgModule({
  declarations: [
    PanComponent,
    BasicInfoComponent,
    AddressComponent,
    IncomeComponent,
    SelfieComponent,
    PreviewComponent,
    ProfileHomeComponent,
    CheckEligibilityErrorComponent,
    CheckEligibilitySuccessComponent,
    LoanHistoryComponent,
    LoanDetailComponent,
    LoanRepayComponent,
    PrivacyComponent,
  ],
  imports: [
    CommonModule,
    ProfileRoutingModule,
    FormsModule,
    ReactiveFormsModule,
  ],
})
export class ProfileModule {}
