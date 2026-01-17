import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanApplicationHomeComponent } from './loan-application-home.component';

describe('LoanApplicationHomeComponent', () => {
  let component: LoanApplicationHomeComponent;
  let fixture: ComponentFixture<LoanApplicationHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LoanApplicationHomeComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LoanApplicationHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
