import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { PayNowLandingComponent } from './pay-now-landing/pay-now-landing.component';
import { ContactUsComponent } from './contact-us/contact-us.component';
import { TermsConditionComponent } from './terms-condition/terms-condition.component';
import { TermsAndConditionsComponent } from './terms-and-conditions/terms-and-conditions.component';
import { GuestGuard } from '../../core/guards/guest.guard';

const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    canActivate: [GuestGuard],
  },
  {
     path: 'pay-now',
     component: PayNowLandingComponent,
     canActivate: [GuestGuard],
  },
  {
    path: 'contact-us',
    component: ContactUsComponent,
    canActivate: [GuestGuard],
  },
  {
    path: 'privacy-policy',
    component: TermsConditionComponent,
    canActivate: [GuestGuard],
  },
  {
    path: 'terms-and-conditions',
    component: TermsAndConditionsComponent,
    canActivate: [GuestGuard],
  }

];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LandingRoutingModule { }
