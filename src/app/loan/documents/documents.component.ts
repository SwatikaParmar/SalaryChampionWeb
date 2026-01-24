import { Component, OnInit } from '@angular/core';
import { ContentService } from '../../../service/content.service';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';

interface DocumentStep {
  label: string;
  code: string;
  docTypeId: number;
  docPart?: string | null;
  required: boolean;
  uploaded: boolean;
  url?: string | null;
  image: string;
  file?: File;
}

@Component({
  selector: 'app-documents',
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.css'],
})
export class DocumentsComponent implements OnInit {

  applicationId!: string;
  steps: DocumentStep[] = [];
  activeIndex = 0;

  showUploadModal = false;
  password = '';
  isUploading = false;

  constructor(
    private contentService: ContentService,
    private router: Router,
    private spinner: NgxSpinnerService,   // ✅ spinner
    private toastr: ToastrService         // ✅ toaster
  ) {}

  ngOnInit(): void {
    this.getBorrowerSnapshot();
  }

  /* ===============================
     GET BORROWER SNAPSHOT
  =============================== */
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
      }
    });
  }

  /* ===============================
     LOAD DOCUMENT CHECKLIST
  =============================== */
  loadDocumentChecklist() {
    this.contentService.documentCheckList(this.applicationId).subscribe({
      next: (res: any) => {
        this.spinner.hide();

        if (!res?.success) {
          this.toastr.error('Failed to load document checklist');
          return;
        }

        const requiredDocs = res.data.checklist.filter(
          (doc: any) => doc.required === true
        );

        // 🔥 NO DOCUMENTS REQUIRED
        if (requiredDocs.length === 0) {
          this.navigateToDisbursal();
          return;
        }

        this.steps = requiredDocs.map((doc: any) => ({
          label: doc.label,
          code: doc.code,
          docTypeId: doc.docTypeId,
          docPart: doc.docPart,
          required: doc.required,
          uploaded: doc.uploaded,
          url: doc.url,
          image: this.getImageByDocTypeId(doc.docTypeId),
        }));

        this.activeIndex = 0;
      },
      error: () => {
        this.spinner.hide();
        this.toastr.error('Failed to fetch document checklist');
      }
    });
  }

  navigateToDisbursal() {
    setTimeout(() => {
      this.router.navigate(['/dashboard/loan/bank']);
    }, 300);
  }

  /* ===============================
     MODAL HANDLERS
  =============================== */
  openUpload() {
    this.showUploadModal = true;
  }

  closeUpload() {
    this.showUploadModal = false;
    this.password = '';
  }

  /* ===============================
     FILE UPLOAD FLOW
  =============================== */
  async onFileSelect(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;

    const step = this.steps[this.activeIndex];
    this.isUploading = true;
    this.spinner.show();

    try {
      /* 1️⃣ REQUEST UPLOAD META */
      const payload = {
        applicationId: this.applicationId,
        docTypeId: step.docTypeId,
        docPart: step.docPart,
        fileName: file.name,
        contentType: file.type,
        password: this.password || null
      };

      const metaRes: any = await this.contentService
        .uploadDocumentMeta(payload)
        .toPromise();

      if (!metaRes?.success || !metaRes?.data?.upload || !metaRes?.data?.fileId) {
        throw new Error('Failed to get upload URL');
      }

      const { upload, fileId, s3Key } = metaRes.data;

      /* 2️⃣ UPLOAD TO S3 */
      const s3Response = await fetch(upload.url, {
        method: upload.method || 'PUT',
        headers: {
          ...(upload.headers || {}),
          'Content-Type': file.type
        },
        body: file
      });

      if (!s3Response.ok) {
        throw new Error(`Upload failed (${s3Response.status})`);
      }

      /* 3️⃣ COMPLETE UPLOAD */
      const completeRes: any = await this.contentService
        .completeUpload(fileId)
        .toPromise();

      if (!completeRes?.success) {
        throw new Error('Failed to complete upload');
      }

      /* 4️⃣ UPDATE UI */
      step.uploaded = true;
      step.file = file;
      step.url = s3Key;

      this.toastr.success('Document uploaded successfully ✅');
      this.closeUpload();

    } catch (err: any) {
      console.error('Upload failed', err);
      this.toastr.error(err?.message || 'Document upload failed');
    } finally {
      this.spinner.hide();
      this.isUploading = false;
      this.password = '';
    }
  }

  /* ===============================
     NAVIGATION
  =============================== */
  next() {
    if (this.activeIndex < this.steps.length - 1) {
      this.activeIndex++;
    }
  }

  prev() {
    if (this.activeIndex > 0) {
      this.activeIndex--;
    }
  }

  /* ===============================
     IMAGE MAPPING
  =============================== */
  getImageByDocTypeId(docTypeId: number): string {
    switch (docTypeId) {
      case 10: return 'assets/images/utility_bill.png';
      case 11: return 'assets/images/sale_deed.png';
      case 12: return 'assets/images/conveyance_deed.png';
      case 13: return 'assets/images/allotment_letter.png';
      case 14: return 'assets/images/house_tax_receipt.png';
      case 15: return 'assets/images/credit_card_statement.png';
      case 16: return 'assets/images/electricity_bill.png';
      case 17: return 'assets/images/landline_bill.png';
      case 18: return 'assets/images/gas_bill.png';
      case 19: return 'assets/images/water_bill.png';
      case 20: return 'assets/images/rent_agreement.png';

      default:
        return 'assets/images/default_document.png';
    }
  }
}
