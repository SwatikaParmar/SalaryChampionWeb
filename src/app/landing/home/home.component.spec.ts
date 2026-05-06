import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';

import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HomeComponent],
      imports: [FormsModule, RouterTestingModule],
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should allow the amount slider to reach the configured maximum', () => {
    const amountSlider: HTMLInputElement =
      fixture.nativeElement.querySelector('input.slider');

    expect(amountSlider.min).toBe(`${component.minLoanAmount}`);
    expect(amountSlider.max).toBe(`${component.maxLoanAmount}`);
    expect(amountSlider.step).toBe(`${component.loanAmountStep}`);
    expect((component.maxLoanAmount - component.minLoanAmount) % component.loanAmountStep).toBe(0);
  });
});
