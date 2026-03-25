import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ContentService } from '../../../service/content.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';

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
        const d = res?.data;

        this.data = d;
        this.summary = d?.summary;
        this.journey = d?.journey?.status;
        this.statement = d?.statementVerification;
        this.borrower = d?.applicationSnapshot?.applicationBasic;

      },
      error: () => {
        this.spinner.hide();
        this.toastr.error('Failed to load details');
      }
    });
  }

  goBack() {
    window.history.back();
  }

}
