import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContentService } from '../../../../service/content.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';

declare var bootstrap: any;

@Component({
  selector: 'app-bank-statement',
  templateUrl: './bank-statement.component.html',
  styleUrls: ['./bank-statement.component.css'],
})
export class BankStatementComponent implements OnInit {
  applicationId!: string;

  selectedFile!: File;
  password: string = '';

  isUploading = false;
  uploadCompleted = false;

  uploadModal: any;

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
          this.toastr.error('Failed to load borrower snapshot');
          return;
        }

        this.applicationId = res.data.application.id;

        // 🔥 CHECK BANK STATEMENT STATUS
        this.checkBankStatementStatus();
      },
      error: () => {
        this.spinner.hide();
        this.toastr.error('Failed to load borrower snapshot');
      },
    });
  }

  /* ================= CHECKLIST ================= */
  checkBankStatementStatus() {
    this.contentService.documentCheckList(this.applicationId).subscribe({
      next: (res: any) => {
        this.spinner.hide();

        if (!res?.success || !res.data?.checklist) return;

        const bankDoc = res.data.checklist.find(
          (doc: any) => doc.code === 'BANK_STATEMENT_3M'
        );

        // ✅ ALREADY UPLOADED → SALARY PAGE
        if (
          bankDoc &&
          bankDoc.uploaded === true &&
          bankDoc.uploadStatus === 'UPLOADED' &&
          bankDoc.status === 'UPLOADED'
        ) {
          this.router.navigate(['/dashboard/loan/salary-slip']);
          return;
        }

        // ❌ else stay here (upload UI visible)
      },
      error: () => {
        this.spinner.hide();
        this.toastr.error('Failed to load document checklist');
      },
    });
  }

  /* ================= OPEN MODAL ================= */
  openUploadModal() {
    const modalEl = document.getElementById('bankUploadModal');
    this.uploadModal = new bootstrap.Modal(modalEl);
    this.uploadModal.show();
  }

  /* ================= FILE PICK ================= */
  onFilePicked(event: any) {
    this.selectedFile = event.target.files[0];
  }

  /* ================= CONFIRM UPLOAD ================= */
  async confirmUpload() {
    if (!this.selectedFile) {
      this.toastr.warning('Please select a file');
      return;
    }

    this.spinner.show();
    this.isUploading = true;

    try {
      // STEP 1: META
      const metaPayload = {
        applicationId: this.applicationId,
        docTypeId: 3,
        fileName: this.selectedFile.name,
        contentType: this.selectedFile.type,
        password: this.password || null,
      };

      const metaRes: any = await this.contentService
        .uploadDocumentMeta(metaPayload)
        .toPromise();

      const { upload, fileId } = metaRes.data;

      // STEP 2: S3 UPLOAD
      await fetch(upload.url, {
        method: upload.method || 'PUT',
        headers: {
          ...(upload.headers || {}),
          'Content-Type': this.selectedFile.type,
        },
        body: this.selectedFile,
      });

      // STEP 3: COMPLETE
      await this.contentService.completeUpload(fileId).toPromise();

      this.toastr.success('Bank statement uploaded successfully ✅');
      this.uploadCompleted = true;

      this.uploadModal.hide();
    } catch (err: any) {
      this.toastr.error(err?.message || 'Upload failed');
    } finally {
      this.spinner.hide();
      this.isUploading = false;
      this.password = '';
      this.selectedFile = undefined as any;
    }
  }

  /* ================= CONTINUE ================= */
  continue() {
    this.router.navigate(['/dashboard/loan/salary-slip']);
  }
}
