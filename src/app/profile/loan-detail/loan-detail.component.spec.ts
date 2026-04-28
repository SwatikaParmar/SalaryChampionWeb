import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';

import { LoanDetailComponent } from './loan-detail.component';
import { ContentService } from '../../../service/content.service';

describe('LoanDetailComponent', () => {
  let component: LoanDetailComponent;
  let fixture: ComponentFixture<LoanDetailComponent>;
  let contentServiceMock: {
    getLoanDetail: jasmine.Spy;
  };

  beforeEach(async () => {
    contentServiceMock = {
      getLoanDetail: jasmine.createSpy('getLoanDetail').and.returnValue(of({ data: {} }))
    };

    await TestBed.configureTestingModule({
      declarations: [LoanDetailComponent],
      imports: [RouterTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => 'APP123'
              }
            }
          }
        },
        {
          provide: ContentService,
          useValue: contentServiceMock
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
          useValue: {
            error: () => undefined,
            warning: () => undefined
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoanDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should map borrower loan detail response to the allowed UI fields', () => {
    contentServiceMock.getLoanDetail.and.returnValue(of({
      data: {
        applicationId: 'APP123',
        applicationNumber: 'SCRFL00168',
        loan: {
          loanId: 'LN001'
        },
        loanTerms: {
          netDisbAmount: 6650,
          processingFeePercent: 5,
          processingFeeAmount: 350,
          convenienceFeeAmount: 120,
          conversionFeeAmount: 40,
          totalFeeAmount: 510,
          gstPercent: 18,
          gstAmount: 92
        },
        status: {
          loanStatus: 'CLOSED'
        },
        overview: {
          approvedAmount: 7000,
          totalPayableAmount: 8089,
          totalPaidAmount: 8089,
          finalDueAmount: 0,
          principalAmount: 7000,
          interestAmount: 490,
          currentInterestAmount: 420,
          penalInterestAmount: 599,
          repayAmount: 8075,
          totalRepayAmount: 8089,
          repaymentMode: 'UPI',
          tenureDays: 35,
          tenureMode: 'DAYS',
          roiPerDay: 1.4,
          delayDays: 3,
          disbursalDateDisplay: '2026-04-01',
          repayDateDisplay: '2026-04-20'
        },
        dates: {
          createdAtDisplay: '2026-04-01T00:00:00+05:30',
          paidOnDisplay: '2026-04-20T00:00:00+05:30',
          closedOnDisplay: '2026-04-20'
        },
        noc: {
          available: true,
          viewUrl: 'https://example.com/noc'
        },
        actions: {
          repaymentScheduleEndpoint: '/repayment-schedule',
          outstandingLedgerEndpoint: '/outstanding-ledger'
        },
        repayment: {
          calculation: {
            totalWaivedAmount: 0
          },
          rows: [
            {
              label: 'Principal',
              payableAmount: 7000,
              receivedAmount: 7000,
              outstandingAmount: 0
            }
          ]
        },
        paymentRecords: [
          {
            paidAtDisplay: '2026-04-20T00:00:00+05:30',
            amount: 8089,
            paymentMode: 'UPI',
            referenceNo: 'PAY123',
            verificationStatus: 'VERIFIED',
            remarks: 'Paid successfully'
          }
        ]
      }
    }));

    fixture = TestBed.createComponent(LoanDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.applicationNumber).toBe('SCRFL00168');
    expect(component.loanStatus).toBe('CLOSED');
    expect(component.approvedAmount).toBe(7000);
    expect(component.totalPayableAmount).toBe(8089);
    expect(component.totalPaidAmount).toBe(8089);
    expect(component.outstandingAmount).toBe(0);
    expect(component.principalAmount).toBe(7000);
    expect(component.netDisbAmount).toBe(6650);
    expect(component.processingFeePercent).toBe(5);
    expect(component.processingFeeAmount).toBe(350);
    expect(component.convenienceFeeAmount).toBe(120);
    expect(component.conversionFeeAmount).toBe(40);
    expect(component.totalFeeAmount).toBe(510);
    expect(component.gstPercent).toBe(18);
    expect(component.gstAmount).toBe(92);
    expect(component.totalWaivedAmount).toBe(0);
    expect(component.hasFeeSummary).toBeTrue();
    expect(component.hasTotalWaivedAmount).toBeFalse();
    expect(component.processingFeePercentDisplay).toBe('5%');
    expect(component.gstPercentDisplay).toBe('18%');
    expect(component.currentInterestAmount).toBe(420);
    expect(component.interestAmount).toBe(420);
    expect(component.penalInterestAmount).toBe(599);
    expect(component.repayAmount).toBe(8075);
    expect(component.totalRepayAmount).toBe(8089);
    expect(component.repaymentMode).toBe('UPI');
    expect(component.tenureDisplay).toBe('35 DAYS');
    expect(component.roiPerDayDisplay).toBe('1.4');
    expect(component.delayDaysDisplay).toBe('3');
    expect(component.appliedDateDisplay).toBe('01-04-2026');
    expect(component.disbursedOnDisplay).toBe('01-04-2026');
    expect(component.dueDateDisplay).toBe('20-04-2026');
    expect(component.paidOnDisplay).toBe('20-04-2026');
    expect(component.closedOnDisplay).toBe('20-04-2026');
    expect(component.hasNocButton).toBeTrue();
    expect(component.nocUrl).toBe('https://example.com/noc');
    expect(component.loanId).toBe('LN001');
    expect(component.repaymentScheduleEndpoint).toBe('/repayment-schedule');
    expect(component.outstandingLedgerEndpoint).toBe('/outstanding-ledger');
    expect(component.repaymentRows.length).toBe(1);
    expect(component.paymentRecords.length).toBe(1);
    expect(component.paymentRecords[0].paidAtDisplay).toBe('20-04-2026');
    expect(fixture.nativeElement.textContent).not.toContain('Convenience Fee Amount');
    expect(fixture.nativeElement.textContent).not.toContain('Total Fee Amount');
    expect(fixture.nativeElement.textContent).not.toContain('Total Waived Amount');
  });

  it('should render total waived amount only when it is greater than zero', () => {
    contentServiceMock.getLoanDetail.and.returnValue(of({
      data: {
        applicationId: 'APP123',
        applicationNumber: 'SCRFL00169',
        status: {
          loanStatus: 'ACTIVE'
        },
        overview: {
          approvedAmount: 12000
        },
        loanTerms: {
          totalFeeAmount: 500
        },
        repayment: {
          calculation: {
            totalWaivedAmount: 250
          }
        }
      }
    }));

    fixture = TestBed.createComponent(LoanDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.totalWaivedAmount).toBe(250);
    expect(component.hasTotalWaivedAmount).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Total Waived Amount');
  });

  it('should hide disbursed on when loan status is in progress', () => {
    contentServiceMock.getLoanDetail.and.returnValue(of({
      data: {
        applicationId: 'APP123',
        applicationNumber: 'SCRFL00170',
        status: {
          loanStatus: 'In Progress'
        },
        overview: {
          approvedAmount: 12000,
          disbursalDateDisplay: '2026-04-28'
        }
      }
    }));

    fixture = TestBed.createComponent(LoanDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.showDisbursedOn).toBeFalse();
    expect(component.disbursedOnDisplay).toBe('28-04-2026');
    expect(fixture.nativeElement.textContent).not.toContain('Disbursed On');
  });
});
