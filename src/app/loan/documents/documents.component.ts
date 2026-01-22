import { Component, OnInit } from '@angular/core';
import { ContentService } from '../../../service/content.service';
import { Router } from '@angular/router';

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

  constructor(private contentService: ContentService, private router: Router) {}

  ngOnInit(): void {
    this.getBorrowerSnapshot();
  }

  getBorrowerSnapshot() {
    this.contentService.getBorrowerSnapshot().subscribe({
      next: (res: any) => {
        if (!res?.success) return;
        this.applicationId = res.data.application.id;
        this.loadDocumentChecklist();
      }
    });
  }

loadDocumentChecklist() {
  this.contentService.documentCheckList(this.applicationId).subscribe({
    next: (res: any) => {
      if (!res?.success) return;

      const requiredDocs = res.data.checklist.filter(
        (doc: any) => doc.required === true
      );

      /* 🔥 CASE: NO REQUIRED DOCUMENTS LEFT */
      if (requiredDocs.length === 0) {
        // ✅ Directly move to Disbursal page
        this.navigateToDisbursal();
        return;
      }

      /* ✅ OTHERWISE SHOW DOCUMENT FLOW */
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
    }
  });
}

navigateToDisbursal() {
  // Optional: small delay for smooth UX
  setTimeout(() => {
    // 🔥 Change route as per your app
    // window.location.href = '/dashboard/loan/disbursal';
    // OR (better way if Router injected)
     this.router.navigate(['/dashboard/loan/disbursal']);
  }, 300);
}

  openUpload() {
    console.log('UPLOAD CLICKED'); // 🔥 DEBUG
    this.showUploadModal = true;
  }

  closeUpload() {
    this.showUploadModal = false;
    this.password = '';
  }

async onFileSelect(event: any) {
  const file: File = event.target.files[0];
  if (!file) return;

  const step = this.steps[this.activeIndex];
  this.isUploading = true;

  try {
    /* ==============================
       STEP 1️⃣ : REQUEST PRESIGNED URL
    ============================== */
    const payload = {
      applicationId: this.applicationId,
      docTypeId: step.docTypeId,
      docPart: step.docPart,
      fileName: file.name,
      contentType: file.type,
      password: this.password || null
    };

    const metaRes = await this.contentService
      .uploadDocumentMeta(payload)
      .toPromise();

    if (!metaRes?.success || !metaRes?.data?.upload || !metaRes?.data?.fileId) {
      throw new Error('Failed to get upload URL');
    }

    const { upload, fileId, s3Key } = metaRes.data;

    /* ==============================
       STEP 2️⃣ : UPLOAD FILE TO S3
    ============================== */
    const s3Response = await fetch(upload.url, {
      method: upload.method || 'PUT',
      headers: {
        ...(upload.headers || {}),
        'Content-Type': file.type // 🔥 IMPORTANT
      },
      body: file
    });

    if (!s3Response.ok) {
      throw new Error(`S3 upload failed (${s3Response.status})`);
    }

    /* ==============================
       STEP 3️⃣ : COMPLETE UPLOAD (🔥 REQUIRED)
    ============================== */
    const completeRes = await this.contentService
      .completeUpload(fileId)
      .toPromise();

    if (!completeRes?.success) {
      throw new Error('Failed to complete upload');
    }

    /* ==============================
       STEP 4️⃣ : UPDATE UI STATE
    ============================== */
    step.uploaded = true;
    step.file = file;
    step.url = s3Key;

    this.closeUpload();

  } catch (err: any) {
    console.error('Upload failed', err);
    alert(err?.message || 'Upload failed');
  } finally {
    this.isUploading = false;
    this.password = '';
  }
}




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

 


  getImageByDocTypeId(docTypeId: number): string {
  switch (docTypeId) {

    case 10:
      return 'assets/images/utility_bill.png';

    case 11:
      return 'assets/images/sale_deed.png';

    case 12:
      return 'assets/images/conveyance_deed.png';

    case 13:
      return 'assets/images/allotment_letter.png';

    case 14:
      return 'assets/images/house_tax_receipt.png';

    case 15:
      return 'assets/images/credit_card_statement.png';

    case 16:
      return 'assets/images/electricity_bill.png';

    case 17:
      return 'assets/images/landline_bill.png';

    case 18:
      return 'assets/images/gas_bill.png';

    case 19:
      return 'assets/images/water_bill.png';

    case 20:
      return 'assets/images/rent_agreement.png';

    // Aadhaar, PAN, Bank, Salary, etc.
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
    case 6:
      return 'assets/images/default_document.png';

    default:
      return 'assets/images/default_document.png';
  }
}

}
