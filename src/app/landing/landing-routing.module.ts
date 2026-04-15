import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { PayNowLandingComponent } from './pay-now-landing/pay-now-landing.component';
import { ContactUsComponent } from './contact-us/contact-us.component';
import { TermsConditionComponent } from './terms-condition/terms-condition.component';

const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
     path: 'pay-now',
     component: PayNowLandingComponent
  },
  {
    path: 'contact-us',
    component: ContactUsComponent
  },{
    path: 'terms-condition',
    component: TermsConditionComponent
  }

];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LandingRoutingModule { }
