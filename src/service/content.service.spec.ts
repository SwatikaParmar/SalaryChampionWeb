import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../environments/environment';
import { ContentService } from './content.service';

describe('ContentService', () => {
  let service: ContentService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });

    service = TestBed.inject(ContentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should normalize loan history status from item.status.customerLoanStatus', () => {
    let responseBody: any;

    service.getLoanHistory({ page: 1 }).subscribe((response) => {
      responseBody = response;
    });

    const req = httpMock.expectOne(
      (request) => request.url === environment.apiUrl + 'loan/borrower/history'
    );

    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('1');

    req.flush({
      data: {
        items: [
          {
            applicationId: 'APP123',
            status: {
              customerLoanStatus: 'CLOSED'
            }
          }
        ]
      }
    });

    expect(responseBody.data.items[0].status.loanStatus).toBe('CLOSED');
    expect(responseBody.data.items[0].overview.loanStatus).toBe('CLOSED');
  });

  it('should normalize loan history status from item.overview.customerLoanStatus', () => {
    let responseBody: any;

    service.getLoanHistory({ page: 1 }).subscribe((response) => {
      responseBody = response;
    });

    const req = httpMock.expectOne(
      (request) => request.url === environment.apiUrl + 'loan/borrower/history'
    );

    req.flush({
      data: {
        items: [
          {
            applicationId: 'APP124',
            overview: {
              customerLoanStatus: 'IN_PROGRESS'
            }
          }
        ]
      }
    });

    expect(responseBody.data.items[0].status.loanStatus).toBe('IN_PROGRESS');
    expect(responseBody.data.items[0].overview.loanStatus).toBe('IN_PROGRESS');
  });

  it('should normalize loan detail status from data.status.customerLoanStatus', () => {
    let responseBody: any;

    service.getLoanDetail('APP123').subscribe((response) => {
      responseBody = response;
    });

    const req = httpMock.expectOne(
      `${environment.apiUrl}loan/borrower/loan-detail?applicationId=APP123`
    );

    expect(req.request.method).toBe('GET');

    req.flush({
      data: {
        status: {
          customerLoanStatus: 'DISBURSED'
        }
      }
    });

    expect(responseBody.data.status.loanStatus).toBe('DISBURSED');
  });

  it('should normalize loan detail status from data.loan.customerLoanStatus', () => {
    let responseBody: any;

    service.getLoanDetail('APP124').subscribe((response) => {
      responseBody = response;
    });

    const req = httpMock.expectOne(
      `${environment.apiUrl}loan/borrower/loan-detail?applicationId=APP124`
    );

    req.flush({
      data: {
        loan: {
          customerLoanStatus: 'ACTIVE'
        }
      }
    });

    expect(responseBody.data.status.loanStatus).toBe('ACTIVE');
    expect(responseBody.data.loan.loanStatus).toBe('ACTIVE');
  });
});
