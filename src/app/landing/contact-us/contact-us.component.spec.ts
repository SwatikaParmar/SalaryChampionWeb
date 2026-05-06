import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContactUsComponent } from './contact-us.component';

describe('ContactUsComponent', () => {
  let component: ContactUsComponent;
  let fixture: ComponentFixture<ContactUsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ContactUsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ContactUsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open an FAQ when clicked', () => {
    component.toggleFaq('faq1');

    expect(component.openFaq).toBe('faq1');
  });

  it('should close the same FAQ when clicked again', () => {
    component.toggleFaq('faq1');
    component.toggleFaq('faq1');

    expect(component.openFaq).toBeNull();
  });

  it('should switch to another FAQ when a different one is clicked', () => {
    component.toggleFaq('faq1');
    component.toggleFaq('faq2');

    expect(component.openFaq).toBe('faq2');
  });
});
