import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ErrorVerificationComponent } from './error-verification.component';

describe('ErrorVerificationComponent', () => {
  let component: ErrorVerificationComponent;
  let fixture: ComponentFixture<ErrorVerificationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ErrorVerificationComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ErrorVerificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
