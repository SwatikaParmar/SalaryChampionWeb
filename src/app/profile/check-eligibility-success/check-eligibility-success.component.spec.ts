import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckEligibilitySuccessComponent } from './check-eligibility-success.component';

describe('CheckEligibilitySuccessComponent', () => {
  let component: CheckEligibilitySuccessComponent;
  let fixture: ComponentFixture<CheckEligibilitySuccessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CheckEligibilitySuccessComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CheckEligibilitySuccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
