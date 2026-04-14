import { Component, OnInit } from '@angular/core';
import { ContentService } from '../../../service/content.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { getFirstApiErrorMessage } from '../../../service/api-error.util';
import { formatDateForDisplay } from '../../shared/date-format.util';

@Component({
  selector: 'app-loan-history',
  templateUrl: './loan-history.component.html',
  styleUrls: ['./loan-history.component.css']
})
export class LoanHistoryComponent implements OnInit {

  loanList: any[] = [];
  summary: any = {};
  allSummary: any = {};
  overview: any = {};

  page: number = 1;
  pageSize: number = 10;
  total: number = 0;
  totalPages: number = 0;

  tab: string = 'ALL';
  search: string = '';

  isLoading: boolean = false;

  constructor(
    private contentService: ContentService,
    private spinner: NgxSpinnerService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.getLoanHistory();
  }

  // 🔥 NORMALIZE BACKEND DATA
  normalizeSummary(summary: any) {
    return {
      totalApplications: summary?.totalApplications || 0,
      countsByBucket: {
        active: summary?.countsByBucket?.active || 0,
        closed: summary?.countsByBucket?.closed || 0,
        inProgress: summary?.countsByBucket?.inProgress || 0
      },
      totalApprovedAmount: summary?.totalApprovedAmount || 0,
      totalRequestedAmount: summary?.totalRequestedAmount || 0
    };
  }

  // 🔥 OVERVIEW CARDS
  get overviewCards() {
    const source = this.overview || this.allSummary;

    return [
      { label: 'Total Applications', value: source?.totalApplications, type: 'count' },
      { label: 'Active Loans', value: source?.countsByBucket?.active, type: 'count' },
      { label: 'Closed Loans', value: source?.countsByBucket?.closed, type: 'count' },
      { label: 'In Progress', value: source?.countsByBucket?.inProgress, type: 'count' },
      { label: 'Approved Amount', value: source?.totalApprovedAmount, type: 'amount' },
      { label: 'Requested Amount', value: source?.totalRequestedAmount, type: 'amount' }
    ];
  }

  // ================= API =================
  getLoanHistory() {

    this.isLoading = true;
    this.spinner.show();

    const params = {
      page: this.page,
      pageSize: this.pageSize,
      tab: this.tab,
      search: this.search,
      sortBy: 'createdAt',
      sortOrder: 'DESC'
    };

    this.contentService.getLoanHistory(params).subscribe({

      next: (res: any) => {

        this.spinner.hide();
        this.isLoading = false;

        if (res?.success === false) {
          this.toastr.error(getFirstApiErrorMessage(res, 'Failed to load loan history'));
          return;
        }

        const data = res?.data;
        if (!data) return;

        // 🔥 LIST
        this.loanList = (data.items || []).map((item: any) => ({
          ...item,
          overview: {
            ...item?.overview,
            nextDueDateDisplay:
              formatDateForDisplay(item?.overview?.nextDueDateDisplay) ||
              item?.overview?.nextDueDateDisplay ||
              ''
          }
        }));

        // 🔥 SUMMARY
        const normalized = this.normalizeSummary(data.summary);

        this.summary = normalized;
        this.overview = normalized;

        if (this.tab === 'ALL') {
          this.allSummary = normalized;
        }

        this.total = data.total || 0;
        this.totalPages = data.totalPages || 0;
      },

      error: (err) => {
        this.spinner.hide();
        this.isLoading = false;
        this.toastr.error(getFirstApiErrorMessage(err, 'Failed to load loan history'));
      }

    });
  }

  // ================= TAB =================
  changeTab(tab: string) {
    this.tab = tab;
    this.page = 1;
    this.getLoanHistory();
  }

  // ================= PAGINATION =================
  nextPage() {
    if (this.page < this.totalPages) {
      this.page++;
      this.getLoanHistory();
    }
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.getLoanHistory();
    }
  }

  // ================= ACTION =================
  openDetail(applicationId: string) {
    this.router.navigate(['/dashboard/profile/loan-detail', applicationId]);
  }

  openNoc(url: string) {
    if (url) {
      window.open(url, '_blank');
    } else {
      this.toastr.warning('NOC not available');
    }
  }

}
