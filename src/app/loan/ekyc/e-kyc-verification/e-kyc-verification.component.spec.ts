import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EKYCVerificationComponent } from './e-kyc-verification.component';

describe('EKYCVerificationComponent', () => {
  let component: EKYCVerificationComponent;
  let fixture: ComponentFixture<EKYCVerificationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EKYCVerificationComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EKYCVerificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
