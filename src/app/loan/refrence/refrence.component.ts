import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ContentService } from '../../../service/content.service';
import { Router } from '@angular/router';
@Component({
  selector: 'app-refrence',
  templateUrl: './refrence.component.html',
  styleUrls: ['./refrence.component.css']
})
export class RefrenceComponent implements OnInit {

  referenceForm!: FormGroup;
  applicationId!: string;
  userId!: string;
  submitted = false;
  isSaving = false;

  constructor(
    private fb: FormBuilder,
    private contentService: ContentService,
 private router: Router  ) {}

  ngOnInit(): void {
    this.initForm();
    this.getBorrowerSnapshot();
  }

  /* ===============================
     FORM INIT
  =============================== */
  initForm() {
    this.referenceForm = this.fb.group({
      references: this.fb.array([
        this.createReference(),
        this.createReference()
      ])
    });
  }

  createReference(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
      relation: ['', Validators.required]
    });
  }

  get references(): FormArray {
    return this.referenceForm.get('references') as FormArray;
  }

  /* ===============================
     GET SNAPSHOT + PATCH
  =============================== */
  getBorrowerSnapshot() {
    this.contentService.getBorrowerSnapshot().subscribe({
      next: (res: any) => {
        if (!res?.success) return;

        this.applicationId = res.data.application?.id;
        this.userId = res.data.user?.id;

        const refs = res.data.references; // 🔥 backend key

        if (refs?.length) {
          this.references.clear();

          refs.slice(0, 2).forEach((r: any) => {
            this.references.push(
              this.fb.group({
                name: [r.name, Validators.required],
                phone: [r.phone, Validators.required],
                relation: [r.relation, Validators.required]
              })
            );
          });
        }
      },
      error: () => console.error('Snapshot failed')
    });
  }

  /* ===============================
     SAVE / UPDATE
  =============================== */
  save() {
    this.submitted = true;

    if (this.referenceForm.invalid || this.isSaving) {
      return;
    }

    this.isSaving = true;

    const payload = {
      applicationId: this.applicationId,
      userId: this.userId,
      references: this.referenceForm.value.references
    };

    this.contentService.saveReference(payload).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        if (!res?.success) return;

     this.router.navigate(['/dashboard/loan/disbursal']);
     },
      error: () => {
        this.isSaving = false;
        alert('Something went wrong ❌');
      }
    });
  }
}
