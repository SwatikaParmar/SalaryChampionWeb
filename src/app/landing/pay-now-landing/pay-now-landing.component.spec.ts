import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PayNowLandingComponent } from './pay-now-landing.component';

describe('PayNowLandingComponent', () => {
  let component: PayNowLandingComponent;
  let fixture: ComponentFixture<PayNowLandingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PayNowLandingComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PayNowLandingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
