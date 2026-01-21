import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddressProofComponent } from './address-proof.component';

describe('AddressProofComponent', () => {
  let component: AddressProofComponent;
  let fixture: ComponentFixture<AddressProofComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AddressProofComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AddressProofComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
