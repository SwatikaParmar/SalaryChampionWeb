import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';

import { ContentService } from '../../../service/content.service';
import { getFirstApiErrorMessage } from '../../../service/api-error.util';
import { formatDateForDisplay } from '../../shared/date-format.util';

@Component({
  selector: 'app-loan-detail',
  templateUrl: './loan-detail.component.html',
  styleUrls: ['./loan-detail.component.css']
})
export class LoanDetailComponent implements OnInit {
  applicationId: string | null = null;
  loanId = '';
  repaymentScheduleEndpoint = '';
  outstandingLedgerEndpoint = '';

  data: any = null;
  status: any = {};
  overview: any = {};
  dates: any = {};
  noc: any = {};
  repaymentRows: any[] = [];
  paymentRecords: any[] = [];

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

        const detail = res?.data || {};

        this.data = detail;
        this.applicationId = detail?.applicationId || this.applicationId;
        this.loanId = this.readText(detail?.loan?.loanId);
        this.status = detail?.status || {};
        this.overview = detail?.overview || {};
        this.dates = detail?.dates || {};
        this.noc = detail?.noc || {};
        this.repaymentRows = Array.isArray(detail?.repayment?.rows) ? detail.repayment.rows : [];
        this.paymentRecords = Array.isArray(detail?.paymentRecords)
          ? detail.paymentRecords.map((payment: any) => ({
              ...payment,
              paidAtDisplay: this.formatDisplayDate(
                payment?.paidAtDisplay ||
                payment?.paidAt ||
                payment?.paymentDate
              )
            }))
          : [];
        this.repaymentScheduleEndpoint = this.readText(detail?.actions?.repaymentScheduleEndpoint);
        this.outstandingLedgerEndpoint = this.readText(detail?.actions?.outstandingLedgerEndpoint);
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

  openNoc() {
    if (!this.nocUrl) {
      this.toastr.warning('NOC not available');
      return;
    }

    window.open(this.nocUrl, '_blank', 'noopener');
  }

  get hasDetail(): boolean {
    return !!this.data;
  }

  get applicationNumber(): string {
    return this.readText(this.data?.applicationNumber) || '--';
  }

  get loanStatus(): string {
    return this.readText(this.status?.loanStatus) || '--';
  }

  get approvedAmount(): number | null {
    return this.toNumber(this.overview?.approvedAmount);
  }

  get totalPayableAmount(): number | null {
    return this.toNumber(this.overview?.totalPayableAmount);
  }

  get totalPaidAmount(): number | null {
    return this.toNumber(this.overview?.totalPaidAmount);
  }

  get outstandingAmount(): number | null {
    return this.toNumber(this.overview?.finalDueAmount);
  }

  get principalAmount(): number | null {
    return this.toNumber(this.overview?.principalAmount);
  }

  get interestAmount(): number | null {
    return this.toNumber(this.overview?.interestAmount);
  }

  get penalInterestAmount(): number | null {
    return this.toNumber(this.overview?.penalInterestAmount);
  }

  get totalRepayAmount(): number | null {
    return this.toNumber(this.overview?.totalRepayAmount);
  }

  get repaymentMode(): string {
    return this.readText(this.overview?.repaymentMode) || '--';
  }

  get tenureDisplay(): string {
    const tenureDays = this.toNumber(this.overview?.tenureDays);
    const tenureMode = this.readText(this.overview?.tenureMode);

    if (tenureDays === null && !tenureMode) {
      return '--';
    }

    if (tenureDays === null) {
      return tenureMode;
    }

    return tenureMode ? `${tenureDays} ${tenureMode}` : `${tenureDays}`;
  }

  get roiPerDayDisplay(): string {
    const roiPerDay = this.toNumber(this.overview?.roiPerDay);
    return roiPerDay === null ? '--' : `${roiPerDay}`;
  }

  get delayDaysDisplay(): string {
    const delayDays = this.toNumber(this.overview?.delayDays);
    return delayDays === null ? '--' : `${delayDays}`;
  }

  get disbursedOnDisplay(): string {
    return this.formatDisplayDate(this.overview?.disbursalDateDisplay);
  }

  get dueDateDisplay(): string {
    return this.formatDisplayDate(this.overview?.repayDateDisplay);
  }

  get appliedDateDisplay(): string {
    return this.formatDisplayDate(
      this.dates?.createdAtDisplay ||
      this.dates?.createdOnDisplay ||
      this.dates?.createdAt ||
      this.data?.createdAtDisplay ||
      this.data?.createdAt
    );
  }

  get paidOnDisplay(): string {
    return this.formatDisplayDate(this.dates?.paidOnDisplay);
  }

  get closedOnDisplay(): string {
    return this.formatDisplayDate(this.dates?.closedOnDisplay);
  }

  get hasNocButton(): boolean {
    return !!this.noc?.available && !!this.nocUrl;
  }

  get nocUrl(): string {
    return this.readText(this.noc?.viewUrl) || this.readText(this.noc?.url) || '';
  }

  get hasRepaymentRows(): boolean {
    return this.repaymentRows.length > 0;
  }

  get hasPaymentRecords(): boolean {
    return this.paymentRecords.length > 0;
  }

  private toNumber(value: any): number | null {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  private readText(value: any): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private formatDisplayDate(value: any): string {
    const rawValue = this.readText(value);

    if (!rawValue) {
      return '--';
    }

    return formatDateForDisplay(rawValue) || rawValue;
  }
}
