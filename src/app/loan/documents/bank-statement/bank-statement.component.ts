import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContentService } from '../../../../service/content.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { getFirstApiErrorMessage } from '../../../../service/api-error.util';

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
          this.toastr.error(getFirstApiErrorMessage(res, 'Failed to load borrower snapshot'));
          return;
        }

        this.applicationId = res.data.application.id;

        // 🔥 CHECK BANK STATEMENT STATUS
        this.checkBankStatementStatus();
      },
      error: (err) => {
        this.spinner.hide();
        this.toastr.error(getFirstApiErrorMessage(err, 'Failed to load borrower snapshot'));
      },
    });
  }

  /* ================= CHECKLIST ================= */
checkBankStatementStatus() {
  this.contentService.documentCheckList(this.applicationId).subscribe({
    next: (res: any) => {
      this.spinner.hide();

      if (!res?.success || !res.data?.checklist) {
        // ❌ checklist hi nahi aayi → allow next
        this.router.navigate(['/dashboard/loan/salary-slip']);
        return;
      }

      const checklist = res.data.checklist;

      const bankDoc = checklist.find(
        (doc: any) => doc.code === 'BANK_STATEMENT_3M'
      );

      // ✅ CASE 1: Bank statement NOT REQUIRED
      if (!bankDoc) {
        this.router.navigate(['/dashboard/loan/salary-slip']);
        return;
      }

      // ✅ CASE 2: Bank statement ALREADY UPLOADED
      if (
        bankDoc.uploaded === true &&
        bankDoc.uploadStatus === 'UPLOADED' &&
        bankDoc.status === 'UPLOADED'
      ) {
        this.router.navigate(['/dashboard/loan/salary-slip']);
        return;
      }

      // ❌ CASE 3: Required but NOT uploaded
      // stay on this page → upload UI visible
    },
    error: (err) => {
      this.spinner.hide();
      this.toastr.error(getFirstApiErrorMessage(err, 'Failed to load document checklist'));
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
        password: this.getUploadPassword(),
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
      this.uploadModal?.hide();
      setTimeout(() => this.continue(), 150);
    } catch (err: any) {
      this.toastr.error(getFirstApiErrorMessage(err, 'Upload failed'));
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

  private getUploadPassword(): string | null {
    const normalizedPassword = this.password.trim();
    return normalizedPassword ? normalizedPassword : null;
  }
}
