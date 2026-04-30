import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { ContentService } from '../../../service/content.service';
import { EmploymentComponent } from './employment.component';

describe('EmploymentComponent', () => {
  let component: EmploymentComponent;
  let fixture: ComponentFixture<EmploymentComponent>;

  const contentServiceStub = {
    getBorrowerSnapshot: jasmine.createSpy('getBorrowerSnapshot').and.returnValue(
      of({
        success: true,
        data: {
          application: { id: 'app-1' },
          applicationFlow: {
            nextAction: 'EMPLOYMENT_DETAILS',
            steps: {
              employmentDetails: false,
            },
          },
        },
      }),
    ),
    getEmploymentJourneyDetails: jasmine.createSpy('getEmploymentJourneyDetails').and.returnValue(
      of({
        success: true,
        data: {
          application: {
            personalTabLocked: false,
          },
          employment: {},
          currentAddress: {},
          companyDetail: {
            application: {},
            employment: {},
            employer: {},
            address: {},
          },
          completion: {},
        },
      }),
    ),
    resolvePincode: jasmine.createSpy('resolvePincode').and.returnValue(
      of({ success: true, data: {} }),
    ),
    saveEmploymentJourneyDetails: jasmine.createSpy('saveEmploymentJourneyDetails'),
  };

  const spinnerServiceStub = {
    show: jasmine.createSpy('show'),
    hide: jasmine.createSpy('hide'),
  };

  const toastrServiceStub = {
    success: jasmine.createSpy('success'),
    warning: jasmine.createSpy('warning'),
    error: jasmine.createSpy('error'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EmploymentComponent],
      imports: [ReactiveFormsModule, RouterTestingModule],
      providers: [
        { provide: ContentService, useValue: contentServiceStub },
        { provide: NgxSpinnerService, useValue: spinnerServiceStub },
        { provide: ToastrService, useValue: toastrServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EmploymentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
