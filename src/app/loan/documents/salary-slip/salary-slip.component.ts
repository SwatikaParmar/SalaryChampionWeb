import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { ContentService } from '../../../../service/content.service';

interface SalaryMonth {
  label: string;
  uploaded: boolean;
  docTypeId: number;
}

@Component({
  selector: 'app-salary-slip',
  templateUrl: './salary-slip.component.html',
  styleUrls: ['./salary-slip.component.css'],
})
export class SalarySlipComponent implements OnInit {
  applicationId!: string;

  salaryMonths: SalaryMonth[] = [];
  activeIndex = -1;

  showUploadModal = false;
  selectedFile: File | null = null;
  password = '';
  isUploading = false;

  constructor(
    private contentService: ContentService,
    private router: Router,
    private spinner: NgxSpinnerService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.getBorrowerSnapshot();
  }

  /* ================= SNAPSHOT ================= */
  getBorrowerSnapshot() {
    this.spinner.show();

    this.contentService.getBorrowerSnapshot().subscribe({
      next: (res: any) => {
        if (!res?.success) {
          this.spinner.hide();
          this.toastr.error('Failed to load borrower data');
          return;
        }

        this.applicationId = res.data.application.id;
        this.loadSalaryChecklist();
      },
      error: () => {
        this.spinner.hide();
        this.toastr.error('Failed to fetch borrower snapshot');
      },
    });
  }

  /* ================= LOAD SALARY SLIPS FROM CHECKLIST ================= */
  loadSalaryChecklist() {
    this.contentService.documentCheckList(this.applicationId).subscribe({
      next: (res: any) => {
        this.spinner.hide();

        if (!res?.success || !res.data?.checklist) return;

        // 🔥 filter salary slips
        const salaryDocs = res.data.checklist.filter(
          (doc: any) => doc.code === 'SALARY_SLIP'
        );

        this.salaryMonths = salaryDocs.map((doc: any) => ({
          label: doc.label,
          uploaded:
            doc.uploaded === true &&
            doc.uploadStatus === 'UPLOADED' &&
            doc.status === 'UPLOADED',
          docTypeId: doc.docTypeId,
        }));

        // 🔥 all uploaded → next page
        if (this.salaryMonths.length && this.salaryMonths.every(m => m.uploaded)) {
          this.router.navigate(['/dashboard/loan/documents']);
        }
      },
      error: () => {
        this.spinner.hide();
        this.toastr.error('Failed to load salary checklist');
      },
    });
  }

  /* ================= OPEN MODAL ================= */
  openUpload(index: number) {
    if (this.salaryMonths[index].uploaded) return;

    this.activeIndex = index;
    this.selectedFile = null;
    this.password = '';
    this.showUploadModal = true;
  }

  closeUpload() {
    this.showUploadModal = false;
    this.selectedFile = null;
    this.password = '';
  }

  onFileChange(event: any) {
    this.selectedFile = event.target.files[0];
  }

  /* ================= UPLOAD ================= */
  async uploadSalarySlip() {
    if (!this.selectedFile || this.isUploading) return;

    this.isUploading = true;
    this.spinner.show();

    try {
      const current = this.salaryMonths[this.activeIndex];

      const payload = {
        applicationId: this.applicationId,
        docTypeId: current.docTypeId, // 🔥 dynamic
        fileName: this.selectedFile.name,
        contentType: this.selectedFile.type,
        password: this.password || null,
      };

      const metaRes: any = await this.contentService
        .uploadDocumentMeta(payload)
        .toPromise();

      const { upload, fileId } = metaRes.data;

      await fetch(upload.url, {
        method: upload.method || 'PUT',
        headers: {
          ...(upload.headers || {}),
          'Content-Type': this.selectedFile.type,
        },
        body: this.selectedFile,
      });

      await this.contentService.completeUpload(fileId).toPromise();

      // ✅ mark uploaded
      this.salaryMonths[this.activeIndex].uploaded = true;
      this.toastr.success('Salary slip uploaded');

      this.closeUpload();

      // 🔥 all uploaded → documents
      if (this.salaryMonths.every(m => m.uploaded)) {
        setTimeout(() => {
          this.router.navigate(['/dashboard/loan/documents']);
        }, 300);
      }
    } catch (err: any) {
      this.toastr.error(err?.message || 'Upload failed');
    } finally {
      this.spinner.hide();
      this.isUploading = false;
    }
  }
}
