import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { ContentService } from '../../../../service/content.service';

interface SalaryMonth {
  label: string;
  uploaded: boolean;
  file?: File;
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
    this.generateLastThreeMonths();
    this.getBorrowerSnapshot();
  }

  /* ================= GENERATE LAST 3 MONTHS ================= */
  generateLastThreeMonths() {
    const now = new Date();

    this.salaryMonths = Array.from({ length: 3 }).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return {
        label: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
        uploaded: false,
      };
    });
  }

  /* ================= BORROWER SNAPSHOT ================= */
  getBorrowerSnapshot() {
    this.spinner.show();

    this.contentService.getBorrowerSnapshot().subscribe({
      next: (res: any) => {
        this.spinner.hide();
        if (!res?.success) {
          this.toastr.error('Failed to load borrower data');
          return;
        }
        this.applicationId = res.data.application.id;
      },
      error: () => {
        this.spinner.hide();
        this.toastr.error('Failed to fetch borrower snapshot');
      },
    });
  }

  /* ================= OPEN MODAL ================= */
  openUpload(index: number) {
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

  /* ================= UPLOAD SALARY SLIP ================= */
  async uploadSalarySlip() {
    if (!this.selectedFile || this.isUploading) return;

    this.isUploading = true;
    this.spinner.show();

    try {
      const payload = {
        applicationId: this.applicationId,
        docTypeId: 4, // 🔥 SALARY SLIP
        fileName: this.selectedFile.name,
        contentType: this.selectedFile.type,
        password: this.password || null,
      };

      const metaRes: any = await this.contentService
        .uploadDocumentMeta(payload)
        .toPromise();

      if (!metaRes?.success) {
        throw new Error('Failed to get upload URL');
      }

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

      // ✅ Mark uploaded
      this.salaryMonths[this.activeIndex].uploaded = true;
      this.toastr.success('Salary slip uploaded successfully');

      this.closeUpload();

      // 🔥 If all uploaded → Documents
      if (this.salaryMonths.every((m) => m.uploaded)) {
        setTimeout(() => {
          this.router.navigate(['/dashboard/loan/documents']);
        }, 400);
      }
    } catch (err: any) {
      this.toastr.error(err?.message || 'Upload failed');
    } finally {
      this.spinner.hide();
      this.isUploading = false;
    }
  }
}
