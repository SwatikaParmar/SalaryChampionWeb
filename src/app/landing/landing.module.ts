import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { HomeComponent } from './home/home.component';
import { LandingRoutingModule } from './landing-routing.module';

@NgModule({
  declarations: [HomeComponent],
  imports: [CommonModule, LandingRoutingModule, FormsModule],
})
export class LandingModule {}
