import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { HomeComponent } from './home/home.component';
import { LandingRoutingModule } from './landing-routing.module';
import { PayNowLandingComponent } from './pay-now-landing/pay-now-landing.component';
import { ContactUsComponent } from './contact-us/contact-us.component';
import { TermsConditionComponent } from './terms-condition/terms-condition.component';
import { TermsAndConditionsComponent } from './terms-and-conditions/terms-and-conditions.component';

@NgModule({
  declarations: [HomeComponent, PayNowLandingComponent, ContactUsComponent, TermsConditionComponent, TermsAndConditionsComponent],
  imports: [CommonModule, LandingRoutingModule, FormsModule],
})
export class LandingModule {}
