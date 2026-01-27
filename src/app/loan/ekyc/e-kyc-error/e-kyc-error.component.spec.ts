import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EKycErrorComponent } from './e-kyc-error.component';

describe('EKycErrorComponent', () => {
  let component: EKycErrorComponent;
  let fixture: ComponentFixture<EKycErrorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EKycErrorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EKycErrorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
