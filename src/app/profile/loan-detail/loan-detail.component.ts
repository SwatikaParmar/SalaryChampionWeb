import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ContentService } from '../../../service/content.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { getFirstApiErrorMessage } from '../../../service/api-error.util';

@Component({
  selector: 'app-loan-detail',
  templateUrl: './loan-detail.component.html',
  styleUrls: ['./loan-detail.component.css']
})
export class LoanDetailComponent implements OnInit {

  applicationId: any;
  data: any;
  summary: any;
  journey: any;
  statement: any;
  borrower: any;
  loanTerms: any;

  constructor(
    private route: ActivatedRoute,
    private contentService: ContentService,
    private spinner: NgxSpinnerService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.applicationId = this.route.snapshot.paramMap.get('id');
    this.getLoanDetail();
  }

  getLoanDetail() {
    if (!this.applicationId) return;

    this.spinner.show();

    this.contentService.getLoanDetail(this.applicationId).subscribe({
      next: (res: any) => {
        this.spinner.hide();

        if (res?.success === false) {
          this.toastr.error(getFirstApiErrorMessage(res, 'Failed to load details'));
          return;
        }
debugger
        const d = res?.data;

        this.data = d;
        this.summary = d?.summary;
        this.journey = d?.journey?.status;
        this.statement = d?.statementVerification;
        this.borrower = d?.applicationSnapshot?.applicationBasic;
        this.loanTerms = d?.loanTerms || d?.summary?.loanTerms;

      },
      error: (err) => {
        this.spinner.hide();
        this.toastr.error(getFirstApiErrorMessage(err, 'Failed to load details'));
      }
    });
  }

  goBack() {
    window.history.back();
  }

  get tenureDisplay(): string {
    const computedTenureDays = this.getDateDiffInDays(
      this.loanTerms?.disbursalDate,
      this.loanTerms?.repayDate || this.loanTerms?.maturityDate
    );
    const fallbackTenureDays =
      this.toPositiveNumber(this.loanTerms?.tenureDays) ??
      this.toPositiveNumber(this.summary?.overview?.tenureDays) ??
      this.toPositiveNumber(this.borrower?.tenureDays);
    const tenureDays = computedTenureDays ?? fallbackTenureDays;

    if (tenureDays === null) {
      return '--';
    }

    return `${tenureDays} Day${tenureDays === 1 ? '' : 's'}`;
  }

  private getDateDiffInDays(startDate: string | null | undefined, endDate: string | null | undefined): number | null {
    const start = this.parseDateOnly(startDate);
    const end = this.parseDateOnly(endDate);

    if (!start || !end) {
      return null;
    }

    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const diffInDays = Math.round((end.getTime() - start.getTime()) / millisecondsPerDay);

    if (diffInDays < 0) {
      return null;
    }

    return diffInDays;
  }

  private parseDateOnly(value: string | null | undefined): Date | null {
    if (!value || typeof value !== 'string') {
      return null;
    }

    const [year, month, day] = value.split('-').map((part) => Number(part));

    if (!year || !month || !day) {
      return null;
    }

    return new Date(Date.UTC(year, month - 1, day));
  }

  private toPositiveNumber(value: any): number | null {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : null;
  }

}
