import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';

import { LoanRepayComponent } from './loan-repay.component';
import { ContentService } from '../../../service/content.service';

describe('LoanRepayComponent', () => {
  let component: LoanRepayComponent;
  let fixture: ComponentFixture<LoanRepayComponent>;
  let repaymentSummaryResponse: any;
  let contentServiceSpy: jasmine.SpyObj<ContentService>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;

  beforeEach(async () => {
    repaymentSummaryResponse = {
      data: {
        application: {
          applicationNumber: 'AP2026000128'
        },
        borrower: {
          name: 'SAJAD PARVAIZ PARVAIZ RATHER'
        },
        loan: {
          status: 'ACTIVE'
        },
        summary: {
          nextDueDate: '2026-04-17',
          nextDueAmount: '19550.00'
        },
        dues: {
          overdueAmount: '0.00',
          payableAmount: '19550.00',
          foreclosureQuote: {
            eligible: true,
            asOfDate: '2026-04-03',
            maturityDate: '2026-04-17',
            totalDays: 15,
            elapsedDays: 1,
            interestAccruedTillDate: '170.00',
            interestWaived: '2380.00',
            regularPayableAmount: '19550.00',
            payableAmount: '17170.00'
          }
        },
        paymentOptions: {
          minPayAmount: 1,
          maxPayAmount: 19550,
          suggestedAmounts: [17170, 19550]
        }
      }
    };

    contentServiceSpy = jasmine.createSpyObj<ContentService>('ContentService', [
      'getBorrowerRepaymentSummary',
      'refreshBorrowerRepayment',
      'createBorrowerRepaymentOrder'
    ]);
    contentServiceSpy.getBorrowerRepaymentSummary.and.returnValue(of(repaymentSummaryResponse));
    contentServiceSpy.refreshBorrowerRepayment.and.returnValue(of({ data: {} }));
    contentServiceSpy.createBorrowerRepaymentOrder.and.returnValue(of({ data: {} }));

    toastrSpy = jasmine.createSpyObj<ToastrService>('ToastrService', [
      'error',
      'warning',
      'success'
    ]);

    await TestBed.configureTestingModule({
      declarations: [LoanRepayComponent],
      imports: [FormsModule, RouterTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => 'APP123'
              },
              queryParamMap: {
                get: () => null
              }
            },
            queryParams: of({})
          }
        },
        {
          provide: ContentService,
          useValue: contentServiceSpy
        },
        {
          provide: NgxSpinnerService,
          useValue: {
            show: () => undefined,
            hide: () => undefined
          }
        },
        {
          provide: ToastrService,
          useValue: toastrSpy
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoanRepayComponent);
    component = fixture.componentInstance;
    sessionStorage.clear();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default to foreclosure quote when eligible', () => {
    expect(component.hasForeclosureQuote).toBeTrue();
    expect(component.amountOption).toBe('FORECLOSURE');
    expect(component.payableAmount).toBe(17170);
    expect(component.regularPayableAmount).toBe(19550);
    expect(component.selectedAmount).toBe(17170);
    expect(component.paymentType).toBe('FULL');
  });

  it('should preserve both foreclosure and regular quick amounts', () => {
    expect(component.quickAmounts).toEqual([17170, 19550]);
  });

  it('should keep minimum and custom selections as partial', () => {
    component.selectAmountOption('MINIMUM');
    expect(component.paymentType).toBe('PARTIAL');

    component.selectAmountOption('CUSTOM');
    component.customAmount = 500;
    expect(component.paymentType).toBe('PARTIAL');
  });

  it('should disable full due before maturity date', () => {
    expect(component.isFullDueEnabled).toBeFalse();

    component.selectAmountOption('FULL');
    expect(component.amountOption).not.toBe('FULL');
    expect(component.canPay).toBeTrue();
  });

  it('should enable full due when maturity date matches current date', () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = `${today.getMonth() + 1}`.padStart(2, '0');
    const day = `${today.getDate()}`.padStart(2, '0');
    const dateOnly = `${year}-${month}-${day}`;

    component.summary.foreclosureMaturityDate = dateOnly;
    component.selectAmountOption('FULL');

    expect(component.isFullDueEnabled).toBeTrue();
    expect(component.amountOption).toBe('FULL');
    expect(component.paymentType).toBe('FULL');
  });

  it('should keep full due enabled after maturity date', () => {
    component.summary.foreclosureMaturityDate = '2020-01-01';

    expect(component.isFullDueEnabled).toBeTrue();

    component.selectAmountOption('FULL');
    expect(component.amountOption).toBe('FULL');
  });

  it('should send repayment callback to the loan repay route on the current origin', () => {
    component.createPayment();

    const payload = contentServiceSpy.createBorrowerRepaymentOrder.calls.mostRecent().args[0];

    expect(payload.returnUrl).toBe(`${window.location.origin}/dashboard/profile/loan-repay/APP123`);
  });

  it('should redirect to dashboard flow only for successful full due payments', () => {
    sessionStorage.setItem('repay-option:APP123', 'FULL');
    const navigateSpy = spyOn<any>(component, 'navigateToDashboardWithRefresh');
    const clearStorageSpy = spyOn<any>(component, 'clearRepaymentStorage').and.callThrough();

    contentServiceSpy.refreshBorrowerRepayment.and.returnValue(of({
      data: {
        paymentGatewayOrder: {
          paymentStatus: 'SUCCESS'
        },
        repaymentSummary: {
          payableAmount: 0
        }
      }
    }));

    component.refreshPaymentStatus('ORDER123');

    expect(navigateSpy).toHaveBeenCalled();
    expect(clearStorageSpy).toHaveBeenCalled();
    expect(sessionStorage.getItem('repay-option:APP123')).toBeNull();
    expect(toastrSpy.success).toHaveBeenCalledWith('Payment status updated successfully');
  });

  it('should redirect to dashboard flow for successful foreclosure payments', () => {
    sessionStorage.setItem('repay-option:APP123', 'FORECLOSURE');
    const navigateSpy = spyOn<any>(component, 'navigateToDashboardWithRefresh');
    const clearStorageSpy = spyOn<any>(component, 'clearRepaymentStorage').and.callThrough();

    contentServiceSpy.refreshBorrowerRepayment.and.returnValue(of({
      data: {
        paymentGatewayOrder: {
          paymentStatus: 'SUCCESS'
        },
        repaymentSummary: {
          payableAmount: 0
        }
      }
    }));

    component.refreshPaymentStatus('ORDER123');

    expect(navigateSpy).toHaveBeenCalled();
    expect(clearStorageSpy).toHaveBeenCalled();
    expect(sessionStorage.getItem('repay-option:APP123')).toBeNull();
    expect(toastrSpy.success).toHaveBeenCalledWith('Payment status updated successfully');
  });

  it('should stay on the repayment page for successful non-full payments', () => {
    sessionStorage.setItem('repay-option:APP123', 'CUSTOM');
    const navigateSpy = spyOn<any>(component, 'navigateToDashboardWithRefresh');
    const fetchSummarySpy = spyOn(component, 'fetchSummary').and.callThrough();

    contentServiceSpy.refreshBorrowerRepayment.and.returnValue(of({
      data: {
        paymentGatewayOrder: {
          paymentStatus: 'SUCCESS'
        },
        repaymentSummary: {
          payableAmount: 100
        }
      }
    }));

    component.refreshPaymentStatus('ORDER123');

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(fetchSummarySpy).toHaveBeenCalled();
  });

  it('should use the dashboard refresh flow when going back', () => {
    const navigateSpy = spyOn<any>(component, 'navigateToDashboardWithRefresh');

    component.goBack();

    expect(navigateSpy).toHaveBeenCalled();
  });

  it('should hard redirect repayment success to dashboard refresh route', () => {
    const replaceSpy = spyOn(window.location, 'replace');

    component['navigateToDashboardWithRefresh'](true);

    expect(replaceSpy).toHaveBeenCalledWith(`${window.location.origin}/dashboard?refresh=true`);
  });
});
