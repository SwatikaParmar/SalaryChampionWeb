import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckEligibilityErrorComponent } from './check-eligibility-error.component';

describe('CheckEligibilityErrorComponent', () => {
  let component: CheckEligibilityErrorComponent;
  let fixture: ComponentFixture<CheckEligibilityErrorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CheckEligibilityErrorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CheckEligibilityErrorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
