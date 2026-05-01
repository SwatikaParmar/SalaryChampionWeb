import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';

import { LoanHistoryComponent } from './loan-history.component';
import { ContentService } from '../../../service/content.service';

describe('LoanHistoryComponent', () => {
  let component: LoanHistoryComponent;
  let fixture: ComponentFixture<LoanHistoryComponent>;
  let contentServiceMock: {
    getLoanHistory: jasmine.Spy;
  };

  beforeEach(async () => {
    contentServiceMock = {
      getLoanHistory: jasmine.createSpy('getLoanHistory').and.returnValue(of({
        data: {
          items: [],
          summary: {
            totalApplications: 0,
            countsByBucket: {
              active: 0,
              closed: 0,
              inProgress: 0
            },
            totalApprovedAmount: 0,
            totalRequestedAmount: 0
          },
          total: 0,
          totalPages: 0
        }
      }))
    };

    await TestBed.configureTestingModule({
      declarations: [LoanHistoryComponent],
      imports: [RouterTestingModule],
      providers: [
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

    fixture = TestBed.createComponent(LoanHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should normalize loan history dates to dd-mm-yyyy format', () => {
    contentServiceMock.getLoanHistory.and.returnValue(of({
      data: {
        items: [
          {
            applicationId: 'APP123',
            applicationNumber: 'SCRFL00168',
            overview: {
              historyBucket: 'CLOSED',
              approvedAmount: 7000,
              outstandingAmount: 0,
              maturityDate: '2026-04-20T00:00:00+05:30'
            },
            repayment: {
              paidOnDisplay: '2026-04-20T00:00:00+05:30'
            }
          }
        ],
        summary: {
          totalApplications: 1,
          countsByBucket: {
            active: 0,
            closed: 1,
            inProgress: 0
          },
          totalApprovedAmount: 7000,
          totalRequestedAmount: 7000
        },
        total: 1,
        totalPages: 1
      }
    }));

    fixture = TestBed.createComponent(LoanHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.loanList[0].overview.repayDateDisplay).toBe('20-04-2026');
    expect(component.loanList[0].financials.paidOnDisplay).toBe('20-04-2026');
  });

  it('should not show the in progress tab or status pill in loan history', () => {
    contentServiceMock.getLoanHistory.and.returnValue(of({
      data: {
        items: [
          {
            applicationId: 'APP125',
            applicationNumber: 'SCRFL00171',
            overview: {
              loanStatus: 'IN_PROGRESS',
              approvedAmount: 9000,
              outstandingAmount: 0
            }
          }
        ],
        summary: {
          totalApplications: 1,
          countsByBucket: {
            active: 0,
            closed: 0,
            inProgress: 1
          },
          totalApprovedAmount: 9000,
          totalRequestedAmount: 9000
        },
        total: 1,
        totalPages: 1
      }
    }));

    fixture = TestBed.createComponent(LoanHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.getDisplayLoanStatus('IN_PROGRESS')).toBe('');
    expect(fixture.nativeElement.textContent).not.toContain('In Progress');
  });
});
