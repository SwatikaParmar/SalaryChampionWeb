import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { ContentService } from '../../../../service/content.service';

import { EKYCVerificationComponent } from './e-kyc-verification.component';

describe('EKYCVerificationComponent', () => {
  let component: EKYCVerificationComponent;
  let fixture: ComponentFixture<EKYCVerificationComponent>;
  let contentServiceSpy: jasmine.SpyObj<ContentService>;

  beforeEach(() => {
    contentServiceSpy = jasmine.createSpyObj<ContentService>('ContentService', [
      'getBorrowerSnapshot',
      'verifyEkyc',
    ]);
    contentServiceSpy.getBorrowerSnapshot.and.returnValue(
      of({
        success: true,
        data: {
          application: { id: 'APP123' },
          applicationFlow: { steps: {} },
        },
      }),
    );
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EKYCVerificationComponent],
      providers: [
        { provide: ContentService, useValue: contentServiceSpy },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl']) },
        { provide: NgxSpinnerService, useValue: jasmine.createSpyObj('NgxSpinnerService', ['show', 'hide']) },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['warning']) },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({ requestId: 'REQ1', status: 'success' }),
          },
        },
      ],
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EKYCVerificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should send the borrower to fetch bank statement when that is the next pending step', () => {
    const route = (component as any).resolvePostEkycRoute({
      applicationFlow: {
        steps: {
          fetchBankStatement: false,
          references: false,
          documents: false,
          disbursalBankDetails: false,
        },
      },
    });

    expect(route).toBe('/dashboard/loan/bank');
  });

  it('should skip completed reloan steps and move to the next pending screen', () => {
    const route = (component as any).resolvePostEkycRoute({
      applicationFlow: {
        steps: {
          fetchBankStatement: true,
          references: true,
          documents: false,
          disbursalBankDetails: false,
        },
      },
    });

    expect(route).toBe('/dashboard/loan/bank-statement');
  });

  it('should prefer a valid backend next action route when provided', () => {
    const route = (component as any).resolvePostEkycRoute({
      applicationFlow: {
        nextAction: {
          url: '/dashboard/loan/salary-slip',
        },
        steps: {
          fetchBankStatement: false,
          references: false,
          documents: false,
          disbursalBankDetails: false,
        },
      },
    });

    expect(route).toBe('/dashboard/loan/salary-slip');
  });
});
