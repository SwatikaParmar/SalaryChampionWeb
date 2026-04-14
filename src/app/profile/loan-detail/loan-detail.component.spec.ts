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
            error: () => undefined
          }
        }
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LoanDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should prefer date-based tenure for loan detail display', () => {
    contentServiceMock.getLoanDetail.and.returnValue(of({
      data: {
        loanTerms: {
          tenureDays: 2,
          disbursalDate: '2026-04-14',
          repayDate: '2026-04-15'
        },
        applicationSnapshot: {
          applicationBasic: {
            tenureDays: 2
          }
        }
      }
    }));

    fixture = TestBed.createComponent(LoanDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.tenureDisplay).toBe('1 Day');
  });
});
