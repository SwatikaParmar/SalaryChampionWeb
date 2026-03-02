import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { PayNowLandingComponent } from './pay-now-landing/pay-now-landing.component';


const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
     path: 'pay-now',
     component: PayNowLandingComponent
  }
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LandingRoutingModule { }
