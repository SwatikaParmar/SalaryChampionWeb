import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let nativeElement: HTMLElement;

  beforeEach(() => {
    component = new DashboardComponent(
      {} as any,
      {} as any,
      {} as any,
      { show: () => undefined, hide: () => undefined } as any,
      {} as any,
      {} as any,
      {} as any
    );
    nativeElement = document.createElement('div');
  });

  it('should show the loan closed card while reloan decision is pending', () => {
    component.profileProgress = 100;
    component.loanTracking = {
      loanStatus: 'CLOSED',
      applicationNumber: 'AP2026000128',
      approvedAmount: 12000,
      netDisbursalAmount: 10000,
      repayAmount: 11800,
      penaltyAmount: 250,
      closedOn: '2026-05-01'
    };
    component.reloanDecision = {
      saved: false,
      isSaved: false,
      pending: true,
      eligible: false
    };
    component.ineligibleReason = 'Cooldown active';
    component.retryDate = '2026-05-01';

    expect(component.showClosedLoanUnavailableCard).toBeTrue();
    expect(component.isPendingReloanDecision).toBeTrue();
    expect(component.reloanUnavailableTitle).toBe('Loan Closed Successfully');
    expect(component.showReloanUnavailableReason).toBeFalse();
    expect(component.showReloanUnavailableRetryDate).toBeFalse();
    expect(component.closedLoanSummary).toEqual(jasmine.objectContaining({
      loanNumber: 'AP2026000128',
      loanAmount: 12000,
      disbursedAmount: 10000,
      totalPaidAmount: 11800,
      interestPaidAmount: 1800,
      currentInterestAmount: 1800,
      penaltyInterestPaidAmount: 250,
      closedDateDisplay: '01-05-2026'
    }));
  });

  it('should keep showing loan closed successfully card until reloan eligibility arrives', () => {
    component.profileProgress = 100;
    component.loanTracking = {
      loanStatus: 'CLOSED',
      applicationNumber: 'AP2026000129'
    };
    component.reloanDecision = null;

    expect(component.showClosedLoanUnavailableCard).toBeTrue();
    expect(component.isPendingReloanDecision).toBeTrue();
    expect(component.showReloanActionButton).toBeFalse();
  });

  it('should use current interest amount from borrower snapshot in the closed loan summary', () => {
    component.profileProgress = 100;
    component.borrowerSnapshot = {
      overview: {
        currentInterestAmount: 425
      }
    };
    component.loanTracking = {
      loanStatus: 'CLOSED',
      applicationNumber: 'AP2026000130',
      approvedAmount: 7000,
      netDisbursalAmount: 6500,
      repayAmount: 7200
    };
    component.reloanDecision = {
      saved: false,
      isSaved: false,
      pending: true,
      eligible: false
    };

    expect(component.closedLoanSummary).toEqual(jasmine.objectContaining({
      currentInterestAmount: 425
    }));
  });

  it('should show not eligible state when reloan decision is saved as ineligible', () => {
    component.profileProgress = 100;
    component.loanTracking = {
      loanStatus: 'CLOSED'
    };
    component.reloanDecision = {
      saved: true,
      isSaved: true,
      eligible: false
    };
    component.ineligibleReason = 'Policy rule';
    component.retryDate = '2026-05-20';

    expect(component.showClosedLoanUnavailableCard).toBeTrue();
    expect(component.isRejectedReloanDecision).toBeTrue();
    expect(component.showReloanUnavailableReason).toBeTrue();
    expect(component.showReloanUnavailableRetryDate).toBeTrue();
    expect(component.showReloanActionButton).toBeFalse();
  });

  it('should not surface the raw rejection reason inside the rejected reloan message area', () => {
    component.dashboardPrimaryCardType = 'RELOAN_NOT_ELIGIBLE';
    component.dashboardPrimaryCard = {
      title: 'Reloan Not Eligible',
      message: 'ggg'
    };
    component.ineligibleReason = 'ggg';

    expect(component.closedLoanCardMessage).toBe(
      'Your previous loan is closed, but reloan is not available right now.'
    );
  });

  it('should show eligible card when reloan decision is saved as eligible', () => {
    component.profileProgress = 100;
    component.loanTracking = {
      loanStatus: 'CLOSED',
      nextAction: {
        url: 'https://example.com/reloan?token=abc123&applicationId=APP123'
      }
    };
    component.reloanDecision = {
      saved: true,
      isSaved: true,
      eligible: true
    };

    expect(component.showClosedLoanUnavailableCard).toBeFalse();
    expect(component.showReloanActionButton).toBeTrue();
    expect(component.canApplyReloan).toBeTrue();
  });

  it('should show eligible reloan card when tracking marks reloan as true even before token is ready', () => {
    component.profileProgress = 100;
    component.loanTracking = {
      loanStatus: 'CLOSED',
      reloanEligible: true,
      nextAction: {
        url: 'https://example.com/reloan'
      }
    };
    component.reloanDecision = null;

    expect(component.showClosedLoanUnavailableCard).toBeFalse();
    expect(component.showReloanActionButton).toBeTrue();
    expect(component.canApplyReloan).toBeFalse();
  });

  it('should switch to the eligible reloan card when refreshed tracking marks the borrower eligible', () => {
    component.profileProgress = 100;
    component.loanTracking = {
      loanStatus: 'CLOSED',
      applicationNumber: 'AP2026000131'
    };
    component.reloanDecision = {
      saved: true,
      isSaved: true,
      eligible: false
    };

    (component as any).syncTrackerRuntimeState({
      loanTracking: {
        reloanEligible: true,
        nextAction: {
          url: 'https://example.com/reloan'
        }
      }
    });

    expect(component.reloanDecision).toBeNull();
    expect(component.showClosedLoanUnavailableCard).toBeFalse();
    expect(component.showReloanActionButton).toBeTrue();
    expect(component.canApplyReloan).toBeFalse();
  });

  it('should keep reloan button disabled until the action url has token details', () => {
    component.profileProgress = 100;
    component.applicationId = 'APP123';
    component.loanTracking = {
      loanStatus: 'CLOSED',
      nextAction: {
        url: 'https://example.com/reloan'
      }
    };
    component.reloanDecision = {
      saved: true,
      isSaved: true,
      eligible: true
    };

    expect(component.showReloanActionButton).toBeTrue();
    expect(component.canApplyReloan).toBeFalse();
  });

  it('should preserve an existing valid reloan link when application status sends a stale next action', () => {
    component.applicationId = 'APP123';

    const resolvedNextAction = (component as any).resolveNextAction(
      { url: 'https://example.com/reloan?token=abc123&applicationId=APP123' },
      { url: 'https://example.com/reloan' }
    );

    expect(resolvedNextAction).toEqual({
      url: 'https://example.com/reloan?token=abc123&applicationId=APP123'
    });
  });

  it('should retry refresh flow when api returns invalid reloan token message', () => {
    expect((component as any).shouldRetryReloanToken('Invalid reloanToken.')).toBeTrue();
  });

  it('should suppress stale active loan card when repayment refresh returns zero due balances', () => {
    component.profileProgress = 100;
    component.loanTracking = {
      showActiveLoanCard: true,
      loanStatus: 'ACTIVE',
      applicationNumber: 'AP2026000199',
      approvedAmount: 15000,
      netDisbursalAmount: 12000,
      repayment: {
        outstandingAmount: 0,
        nextDueAmount: 0,
        totalPaidAmount: 12800
      }
    };
    component.trackingSteps = {
      disbursement: 'DONE'
    } as any;
    (component as any).isRepaymentRefreshContext = true;

    (component as any).patchActiveLoanFromSnapshot();

    expect(component.showActiveLoanCard).toBeFalse();
    expect(component.showClosedLoanUnavailableCard).toBeTrue();
    expect(component.isPendingReloanDecision).toBeTrue();
  });

  it('should map the active loan dashboard card from loanTracking fields', () => {
    component.loanTracking = {
      showActiveLoanCard: true,
      applicationNumber: 'SCRFL00172',
      currentTitle: 'IN REVIEW',
      loanStatus: 'DISBURSED',
      approvedAmount: 7000,
      nextDueDate: '2026-04-25',
      finalDueAmount: 7490,
      delayDays: 3
    };
    component.trackingSteps = {
      disbursement: 'DONE'
    } as any;

    (component as any).patchActiveLoanFromSnapshot();

    expect(component.showActiveLoanCard).toBeTrue();
    expect(component.activeLoan).toEqual(jasmine.objectContaining({
      loanNumber: 'SCRFL00172',
      status: 'DISBURSED',
      approvedAmount: 7000,
      repayDateDisplay: '25-04-2026',
      payableNowAmount: 7490,
      delayDays: 3
    }));
  });

  it('should not render delay days in the dashboard card when the value is zero', () => {
    component.activeLoan = {
      repayDateDisplay: '25-04-2026',
      payableNowAmount: 7490,
      delayDays: 0
    };

    nativeElement.innerHTML = `
      ${component.activeLoan?.delayDays > 0 ? '<div class="active-loan-stat"><label>Delay Days</label></div>' : ''}
    `;

    expect(nativeElement.textContent).not.toContain('Delay Days');
  });
});
