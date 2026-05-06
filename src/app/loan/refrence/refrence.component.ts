import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ContentService } from '../../../service/content.service';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { getFirstApiErrorMessage } from '../../../service/api-error.util';

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
    private router: Router,
    private spinner: NgxSpinnerService,   // ✅ ADD
    private toastr: ToastrService         // ✅ ADD
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.getBorrowerSnapshot();
  }

  /* ===============================
     FORM INIT
  =============================== */
  initForm() {
    this.referenceForm = this.fb.group({
      references: this.fb.array(
        [this.createReference(), this.createReference()],
        { validators: [this.duplicateReferencePhoneValidator()] },
      )
    });
  }

  createReference(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
      relation: ['', Validators.required]
    });
  }

  private duplicateReferencePhoneValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const references = control as FormArray;

      if (references.length < 2) {
        return null;
      }

      const firstPhoneControl = references.at(0)?.get('phone');
      const secondPhoneControl = references.at(1)?.get('phone');

      const firstPhone = (firstPhoneControl?.value || '').trim();
      const secondPhone = (secondPhoneControl?.value || '').trim();

      if (!secondPhoneControl) {
        return null;
      }

      const secondPhoneErrors = { ...(secondPhoneControl.errors || {}) };
      delete secondPhoneErrors['duplicatePhone'];

      if (Object.keys(secondPhoneErrors).length) {
        secondPhoneControl.setErrors(secondPhoneErrors);
      } else {
        secondPhoneControl.setErrors(null);
      }

      if (
        firstPhone &&
        secondPhone &&
        firstPhone === secondPhone
      ) {
        secondPhoneControl.setErrors({
          ...(secondPhoneControl.errors || {}),
          duplicatePhone: true,
        });
        return { duplicatePhone: true };
      }

      return null;
    };
  }

  get references(): FormArray {
    return this.referenceForm.get('references') as FormArray;
  }

  /* ===============================
     GET SNAPSHOT + PATCH
  =============================== */
  getBorrowerSnapshot() {
    this.spinner.show(); // 🔥 START LOADER

    this.contentService.getBorrowerSnapshot().subscribe({
      next: (res: any) => {
        this.spinner.hide(); // ✅ STOP LOADER

        if (!res?.success) {
          this.toastr.error(getFirstApiErrorMessage(res, 'Failed to load references'));
          return;
        }

        this.applicationId = res.data.application?.id;
        this.userId = res.data.user?.id;

        const refs = res.data.references;

        if (refs?.length) {
          this.references.clear();

          refs.slice(0, 2).forEach((r: any) => {
            const referenceGroup = this.createReference();
            referenceGroup.patchValue({
              name: r.name || '',
              phone: r.phone || '',
              relation: r.relation || '',
            });
            this.references.push(referenceGroup);
          });

          this.references.updateValueAndValidity();
        }
      },
      error: (err) => {
        this.spinner.hide();
        this.toastr.error(getFirstApiErrorMessage(err, 'Failed to load references'));
      }
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
    this.spinner.show(); // 🔥 START LOADER

    const payload = {
      applicationId: this.applicationId,
      userId: this.userId,
      references: this.referenceForm.value.references
    };

    this.contentService.saveReference(payload).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        this.spinner.hide(); // ✅ STOP LOADER

        if (!res?.success) {
          this.toastr.error(
            getFirstApiErrorMessage(res, 'Failed to save references'),
          );
          return;
        }

        this.toastr.success('References saved successfully ✅');
        this.router.navigate(['/dashboard/loan/bank-statement']);
      },
      error: (err) => {
        this.isSaving = false;
        this.spinner.hide();
        this.toastr.error(
          getFirstApiErrorMessage(err, 'Failed to save references'),
        );
      }
    });
  }

  hasDuplicatePhoneError(index: number): boolean {
    if (index !== 1) {
      return false;
    }

    const phoneControl = this.references.at(index)?.get('phone');
    return !!(
      phoneControl?.hasError('duplicatePhone') &&
      (phoneControl.touched || phoneControl.dirty || this.submitted)
    );
  }
}
