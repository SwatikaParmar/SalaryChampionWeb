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
        borrower: {
          name: 'SAJAD PARVAIZ PARVAIZ RATHER'
        },
        application: {
          applicationId: 'APP123',
          applicationNumber: 'AP2026000128'
        },
        loan: {
          status: 'ACTIVE'
        },
        summary: {
          nextDueDate: '2026-04-17',
          dpd: 6,
          finalDueAmount: '8425.20',
          nextDueAmount: '7140.00',
          penaltyAmount: '1285.20',
          totalPaid: '0.00'
        },
        paymentOptions: {
          allowPartialPayment: true,
          allowFullPayment: true,
          minPayAmount: 1000,
          maxPayAmount: 8425.2,
          suggestedAmounts: [7140, 8425.2]
        },
        actions: {
          createOrderEndpoint: '/loan/borrower/repay/cashfree/order'
        }
      }
    };

    contentServiceSpy = jasmine.createSpyObj<ContentService>('ContentService', [
      'getBorrowerRepaymentSummary',
      'refreshBorrowerRepayment',
      'createBorrowerRepaymentOrder',
      'postToEndpoint'
    ]);
    contentServiceSpy.getBorrowerRepaymentSummary.and.returnValue(of(repaymentSummaryResponse));
    contentServiceSpy.refreshBorrowerRepayment.and.returnValue(of({ data: {} }));
    contentServiceSpy.createBorrowerRepaymentOrder.and.returnValue(of({ data: {} }));
    contentServiceSpy.postToEndpoint.and.returnValue(of({ data: {} }));

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
    }).compileComponents();

    fixture = TestBed.createComponent(LoanRepayComponent);
    component = fixture.componentInstance;
    sessionStorage.clear();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should map the repay summary handoff fields for the screen', () => {
    expect(component.borrowerName).toBe('SAJAD PARVAIZ PARVAIZ RATHER');
    expect(component.applicationNumber).toBe('AP2026000128');
    expect(component.loanStatus).toBe('ACTIVE');
    expect(component.dueDateDisplay).toBe('17-04-2026');
    expect(component.delayDays).toBe(6);
    expect(component.payableNow).toBe(8425.2);
    expect(component.scheduledDue).toBe(7140);
    expect(component.penaltyAmount).toBe(1285.2);
    expect(component.totalPaid).toBe(0);
    expect(component.amountOption).toBe('FULL');
    expect(component.selectedAmount).toBe(8425.2);
  });

  it('should compute CTA amount from minimum, full and custom selections', () => {
    component.selectAmountOption('MINIMUM');
    expect(component.selectedAmount).toBe(7140);

    component.selectAmountOption('FULL');
    expect(component.selectedAmount).toBe(8425.2);

    component.selectAmountOption('CUSTOM');
    component.customAmount = 2500;
    expect(component.selectedAmount).toBe(2500);
  });

  it('should create order using the dynamic createOrderEndpoint', () => {
    const assignSpy = spyOn(window.location, 'assign');

    contentServiceSpy.postToEndpoint.and.returnValue(of({
      data: {
        orderId: 'ORDER123',
        hostedPaymentUrl: 'https://payments.example.com/pay'
      }
    }));

    component.createPayment();

    expect(contentServiceSpy.postToEndpoint).toHaveBeenCalledWith(
      '/loan/borrower/repay/cashfree/order',
      {
        applicationId: 'APP123',
        amount: 8425.2
      }
    );
    expect(assignSpy).toHaveBeenCalledWith('https://payments.example.com/pay');
    expect(sessionStorage.getItem('repay-order:APP123')).toBe('ORDER123');
    expect(sessionStorage.getItem('repay-option:APP123')).toBe('FULL');
  });

  it('should redirect to dashboard flow only for successful full payable payments', () => {
    sessionStorage.setItem('repay-option:APP123', 'FULL');
    const navigateSpy = spyOn<any>(component, 'navigateToDashboardWithRefresh');
    const clearStorageSpy = spyOn<any>(component, 'clearRepaymentStorage').and.callThrough();

    contentServiceSpy.refreshBorrowerRepayment.and.returnValue(of({
      data: {
        paymentGatewayOrder: {
          paymentStatus: 'SUCCESS'
        },
        repaymentSummary: {
          summary: {
            finalDueAmount: 0,
            nextDueAmount: 0,
            nextDueDate: '2026-04-17'
          }
        }
      }
    }));

    component.refreshPaymentStatus('ORDER123');

    expect(navigateSpy).toHaveBeenCalled();
    expect(clearStorageSpy).toHaveBeenCalled();
    expect(sessionStorage.getItem('repay-option:APP123')).toBeNull();
    expect(toastrSpy.success).toHaveBeenCalledWith('Payment status updated successfully');
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
