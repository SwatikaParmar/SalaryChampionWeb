import { Component, OnInit } from '@angular/core';
import { ContentService } from '../../../service/content.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-loan-history',
  templateUrl: './loan-history.component.html',
  styleUrls: ['./loan-history.component.css']
})
export class LoanHistoryComponent implements OnInit {

  loanList: any[] = [];
  summary: any = {};

  // 🔥 Pagination
  page: number = 1;
  pageSize: number = 10;
  total: number = 0;
  totalPages: number = 0;

  // 🔥 Filters
  tab: string = 'ALL';
  search: string = '';

  constructor(
    private contentService: ContentService,
    private spinner: NgxSpinnerService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.getLoanHistory();
  }

  // ================= API CALL =================
isLoading: boolean = false;

allSummary: any = {};   // 🔥 ADD

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

      const data = res?.data;
      if (!data) return;

      this.loanList = data.items || [];

      // 🔥 ONLY UPDATE ALL SUMMARY ON FIRST LOAD OR ALL TAB
      if (this.tab === 'ALL') {
        this.allSummary = data.summary || {};
      }

      // 🔥 CURRENT TAB SUMMARY (optional)
      this.summary = data.summary || {};

      this.total = data.total || 0;
      this.totalPages = data.totalPages || 0;
    },
    error: () => {
      this.spinner.hide();
      this.isLoading = false;
      this.toastr.error('Failed to load loan history');
    }
  });
}

  // ================= TAB CHANGE =================
  changeTab(tab: string) {
    this.tab = tab;
    this.page = 1;
    this.getLoanHistory();
  }

  // ================= SEARCH =================
  onSearch() {
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

  goToPage(p: number) {
    this.page = p;
    this.getLoanHistory();
  }

  getPagesArray(): number[] {
    return Array(this.totalPages).fill(0).map((x, i) => i + 1);
  }

  // ================= ACTIONS =================
openDetail(applicationId: string) {
  this.router.navigate([
    '/dashboard/profile/loan-detail',
    applicationId
  ]);
}

  openNoc(url: string) {
    if (url) {
      window.open(url, '_blank');
    } else {
      this.toastr.warning('NOC not available');
    }
  }

}