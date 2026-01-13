import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ProfileRoutingModule } from './profile-routing.module';
import { PanComponent } from './pan/pan.component';
import { BasicInfoComponent } from './basic-info/basic-info.component';
import { AddressComponent } from './address/address.component';
import { IncomeComponent } from './income/income.component';
import { SelfieComponent } from './selfie/selfie.component';
import { PreviewComponent } from './preview/preview.component';
import { ProfileHomeComponent } from './profile-home/profile-home.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    PanComponent,
    BasicInfoComponent,
    AddressComponent,
    IncomeComponent,
    SelfieComponent,
    PreviewComponent,
    ProfileHomeComponent
  ],
  imports: [
    CommonModule,
    ProfileRoutingModule,
    FormsModule
  ]
})
export class ProfileModule { }
