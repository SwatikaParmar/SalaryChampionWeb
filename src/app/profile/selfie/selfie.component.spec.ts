import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelfieComponent } from './selfie.component';

describe('SelfieComponent', () => {
  let component: SelfieComponent;
  let fixture: ComponentFixture<SelfieComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SelfieComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SelfieComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
