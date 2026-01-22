import { Component, OnInit } from '@angular/core';
import { ContentService } from '../../../service/content.service';

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

  constructor(private contentService: ContentService) {}

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

        this.steps = res.data.checklist.map((doc: any) => ({
          label: doc.label,
          code: doc.code,
          docTypeId: doc.docTypeId,
          docPart: doc.docPart,
          required: doc.required,
          uploaded: doc.uploaded,
          url: doc.url,
          image: this.getImageByLabel(doc.label),
        }));
      }
    });
  }

  openUpload() {
    console.log('UPLOAD CLICKED'); // 🔥 DEBUG
    this.showUploadModal = true;
  }

  closeUpload() {
    this.showUploadModal = false;
    this.password = '';
  }

  onFileSelect(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.steps[this.activeIndex].file = file;
    this.steps[this.activeIndex].uploaded = true;

    this.closeUpload();
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

  getImageByLabel(label: string): string {
    const map: any = {
      'Electricity Bill': 'assets/docs/electricity.png',
      'Credit Card Statement': 'assets/docs/credit-card.png',
      'House Tax Receipt': 'assets/docs/house-tax.png',
      'Allotment Letter': 'assets/docs/allotment.png',
      'Sale Deed': 'assets/docs/sale-deed.png',
      'Utility Bill': 'assets/docs/utility.png',
      'Salary Slip - December 2025': 'assets/docs/salary.png',
      'Latest 3 Months Bank Statement': 'assets/docs/bank.png',
      'PAN Card': 'assets/docs/pan.png',
      'Aadhaar Card (Front)': 'assets/docs/aadhaar-front.png',
      'Aadhaar Card (Back)': 'assets/docs/aadhaar-back.png',
    };
    return map[label] || 'assets/docs/default.png';
  }
}
