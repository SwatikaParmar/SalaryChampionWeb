import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContentService } from '../../../../service/content.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-bank-statement',
  templateUrl: './bank-statement.component.html',
  styleUrls: ['./bank-statement.component.css'],
})
export class BankStatementComponent implements OnInit {
  applicationId!: string;
  steps: any[] = [];
  activeIndex = 0;
  isUploading = false;
  password: string = '';

  constructor(
    private contentService: ContentService,
    private router: Router,
    private spinner: NgxSpinnerService, // ✅ spinner
    private toastr: ToastrService, // ✅ toaster
  ) {}

  ngOnInit(): void {
    this.getBorrowerSnapshot();
  }

  /* ================= BORROWER SNAPSHOT ================= */
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
        this.loadDocumentChecklist();
      },
      error: () => {
        this.spinner.hide();
        this.toastr.error('Failed to fetch borrower snapshot');
      },
    });
  }

  /* ================= FILE SELECT ================= */
  async onFileSelect(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;

    this.isUploading = true;
    this.spinner.show();

    try {
      /* ========= STEP 1: GET PRESIGNED URL ========= */
      const payload = {
        applicationId: this.applicationId,
        docTypeId: 3, // BANK STATEMENT
        fileName: file.name,
        contentType: file.type,
        password: this.password || null,
      };

      const metaRes: any = await this.contentService
        .uploadDocumentMeta(payload)
        .toPromise();

      if (
        !metaRes?.success ||
        !metaRes?.data?.upload ||
        !metaRes?.data?.fileId
      ) {
        throw new Error('Failed to get upload URL');
      }

      const { upload, fileId } = metaRes.data;

      /* ========= STEP 2: UPLOAD TO S3 ========= */
      const s3Response = await fetch(upload.url, {
        method: upload.method || 'PUT',
        headers: {
          ...(upload.headers || {}),
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!s3Response.ok) {
        throw new Error('Bank statement upload failed');
      }

      /* ========= STEP 3: COMPLETE UPLOAD ========= */
      const completeRes: any = await this.contentService
        .completeUpload(fileId)
        .toPromise();

      if (!completeRes?.success) {
        throw new Error('Failed to complete upload');
      }

      this.toastr.success('Bank statement uploaded successfully ✅');

      /* ========= STEP 4: REFRESH CHECKLIST ========= */
      this.loadDocumentChecklist();
    } catch (err: any) {
      console.error(err);
      this.toastr.error(err?.message || 'Upload failed');
    } finally {
      this.spinner.hide();
      this.isUploading = false;
      this.password = '';
      event.target.value = '';
    }
  }

  /* ================= CHECKLIST ================= */
  loadDocumentChecklist() {
    this.contentService.documentCheckList(this.applicationId).subscribe({
      next: (res: any) => {
        this.spinner.hide();

        if (!res?.success) {
          this.toastr.error('Failed to load document checklist');
          return;
        }

        const pendingDocs = res.data.checklist.filter(
          (doc: any) => doc.required === true && !doc.uploaded,
        );

        /* 🔥 NO DOCS LEFT → DISBURSAL */
        if (pendingDocs.length === 0) {
          this.navigateToDisbursal();
          return;
        }

        const nextDoc = pendingDocs[0];

        /* 🔥 ROUTING BASED ON NEXT DOC */
        if (nextDoc.code === 'SALARY_SLIP') {
          this.router.navigate(['/dashboard/loan/salary-slip']);
          return;
        }

        if (nextDoc.code === 'BANK_STATEMENT') {
          this.steps = pendingDocs.map((doc: any) => ({
            label: doc.label,
            code: doc.code,
            docTypeId: doc.docTypeId,
            docPart: doc.docPart,
            uploaded: doc.uploaded,
          }));
          this.activeIndex = 0;
        }
      },
      error: () => {
        this.spinner.hide();
        this.toastr.error('Failed to fetch document checklist');
      },
    });
  }

  /* ================= DISBURSAL ================= */
  navigateToDisbursal() {
    setTimeout(() => {
      this.router.navigate(['/dashboard/loan/bank']);
    }, 300);
  }
}
