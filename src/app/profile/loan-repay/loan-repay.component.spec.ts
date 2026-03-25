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

  beforeEach(async () => {
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
              }
            },
            queryParams: of({})
          }
        },
        {
          provide: ContentService,
          useValue: {
            getBorrowerRepaymentSummary: () => of({ data: {} })
          }
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
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoanRepayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
