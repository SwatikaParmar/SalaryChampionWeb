import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import {
  formatDateForDisplay,
  formatDateInput,
  normalizeDateForInput,
} from '../../shared/date-format.util';
import { getFirstApiErrorMessage } from '../../../service/api-error.util';
import { ContentService } from '../../../service/content.service';

const PLACEHOLDER_ADDRESS_VALUES = new Set(['NA', 'N/A', 'NOTAVAILABLE']);
type EmploymentDateField = 'nextSalaryDate' | 'residingSince' | 'dateOfJoining';

function normalizePlaceholderToken(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\./g, '')
    .replace(/\s+/g, '');
}

function placeholderAddressValidator(control: AbstractControl) {
  const normalizedValue = normalizePlaceholderToken(control.value);

  if (!normalizedValue) {
    return null;
  }

  return PLACEHOLDER_ADDRESS_VALUES.has(normalizedValue)
    ? { placeholderValue: true }
    : null;
}

@Component({
  selector: 'app-employment',
  templateUrl: './employment.component.html',
  styleUrl: './employment.component.css',
})
export class EmploymentComponent implements OnInit {
  employmentForm!: FormGroup;
  applicationId = '';
  nextActionCode = '';
  submitted = false;
  today = '';
  isReadOnly = false;
  isEmploymentStepCompleted = false;
  isCurrentAddressDraft = false;
  currentAddressCompleted = false;
  dateDisplayValues: Record<EmploymentDateField, string> = {
    nextSalaryDate: '',
    residingSince: '',
    dateOfJoining: '',
  };
  dateDisplayErrors: Record<EmploymentDateField, string> = {
    nextSalaryDate: '',
    residingSince: '',
    dateOfJoining: '',
  };

  readonly employmentTypeOptions = [
    { value: 'SALARIED', label: 'Salaried' },
    { value: 'SELF_EMPLOYED', label: 'Self Employed' },
    { value: 'OTHER', label: 'Other' },
  ];

  readonly modeOfIncomeOptions = [
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'CHEQUE', label: 'Cheque' },
    { value: 'CASH', label: 'Cash' },
  ];

  readonly residenceTypeOptions = [
    { value: 'OWNED', label: 'Owned' },
    { value: 'RENTED', label: 'Rented' },
    { value: 'PARENTAL', label: 'Parental' },
    { value: 'COMPANY_PROVIDED', label: 'Company Provided' },
    { value: 'OTHER', label: 'Other' },
  ];

  readonly companyTypeOptions = [
    'PRIVATE',
    'GOVERNMENT',
    'PUBLIC',
    'PSU',
    'NGO',
    'OTHER',
  ];

  constructor(
    private fb: FormBuilder,
    private contentService: ContentService,
    private router: Router,
    private spinner: NgxSpinnerService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.today = new Date().toISOString().split('T')[0];
    this.initForm();
    this.loadBorrowerSnapshot();
  }

  initForm() {
    this.employmentForm = this.fb.group({
      employment: this.fb.group({
        employmentType: ['SALARIED', Validators.required],
        netMonthlyIncome: ['', [Validators.required, Validators.min(1)]],
        nextSalaryDate: [''],
        modeOfIncome: [''],
        existingEmiTotal: ['', Validators.min(0)],
      }),
      currentAddress: this.fb.group({
        line1: ['', [Validators.required, placeholderAddressValidator]],
        line2: [''],
        landmark: [''],
        pincode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
        city: [{ value: '', disabled: true }],
        state: [{ value: '', disabled: true }],
        residenceType: ['', Validators.required],
        residingSince: ['', Validators.required],
      }),
      companyDetail: this.fb.group({
        workingFromHome: [false, Validators.required],
        companyName: ['', [Validators.required, Validators.minLength(2)]],
        companyType: ['', Validators.required],
        designation: ['', [Validators.required, Validators.minLength(2)]],
        dateOfJoining: ['', Validators.required],
        otherIncome: ['', Validators.min(0)],
        cin: [''],
        address: this.fb.group({
          line1: ['', Validators.required],
          line2: [''],
          landmark: [''],
          pincode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
          city: [{ value: '', disabled: true }, Validators.required],
          state: [{ value: '', disabled: true }, Validators.required],
        }),
      }),
    });
  }

  loadBorrowerSnapshot() {
    this.spinner.show();

    this.contentService.getBorrowerSnapshot().subscribe({
      next: (res: any) => {
        if (res?.success === false) {
          this.spinner.hide();
          this.toastr.error(
            getFirstApiErrorMessage(res) || 'Failed to load borrower snapshot',
          );
          return;
        }

        const snapshot = this.unwrapResponse(res);

        this.applicationId = snapshot?.application?.id || '';
        this.nextActionCode = this.resolveNextActionCode(
          snapshot?.applicationFlow?.nextAction,
        );
        this.isEmploymentStepCompleted = !!snapshot?.applicationFlow?.steps?.employmentDetails;

        if (!this.applicationId) {
          this.spinner.hide();
          this.toastr.error('Application not found');
          return;
        }

        this.loadEmploymentJourneyDetails();
      },
      error: (err) => {
        this.spinner.hide();
        this.toastr.error(
          getFirstApiErrorMessage(err) || 'Failed to load borrower snapshot',
        );
      },
    });
  }

  loadEmploymentJourneyDetails() {
    this.contentService.getEmploymentJourneyDetails(this.applicationId).subscribe({
      next: (res: any) => {
        this.spinner.hide();

        if (res?.success === false) {
          this.toastr.error(
            getFirstApiErrorMessage(res) || 'Failed to load employment details',
          );
          return;
        }

        this.bindJourneyResponse(this.unwrapResponse(res));
      },
      error: (err) => {
        this.spinner.hide();
        this.toastr.error(
          getFirstApiErrorMessage(err) || 'Failed to load employment details',
        );
      },
    });
  }

  saveDraft() {
    this.saveJourneyDetails(false);
  }

  saveAndContinue() {
    this.submitted = true;
    this.employmentForm.markAllAsTouched();

    if (this.employmentForm.invalid) {
      this.toastr.warning(
        'Please complete the required employment, current address, and company details',
      );
      return;
    }

    this.saveJourneyDetails(true);
  }

  saveJourneyDetails(shouldContinue: boolean) {
    if (this.isReadOnly) {
      return;
    }

    if (!this.applicationId) {
      this.toastr.error('Application not found');
      return;
    }

    const payload = this.buildPayload();

    this.spinner.show();

    this.contentService.saveEmploymentJourneyDetails(payload).subscribe({
      next: (res: any) => {
        this.spinner.hide();

        if (res?.success === false) {
          this.toastr.error(
            getFirstApiErrorMessage(res) || 'Failed to save employment details',
          );
          return;
        }

        const data = this.unwrapResponse(res);
        this.bindJourneyResponse(data);

        if (!shouldContinue) {
          this.toastr.success('Draft saved successfully');
          return;
        }

        if (data?.completion?.employmentDetailsCompleted === true) {
          this.toastr.success('Employment details saved successfully');
          this.router.navigateByUrl('/dashboard/loan/ekyc');
          return;
        }

        this.toastr.warning('Please complete your current address and company details before continuing');
      },
      error: (err) => {
        this.spinner.hide();
        this.toastr.error(
          getFirstApiErrorMessage(err) || 'Failed to save employment details',
        );
      },
    });
  }

  bindJourneyResponse(data: any) {
    if (!data) {
      return;
    }

    const employment = data?.employment || {};
    const currentAddress = data?.currentAddress || {};
    const companyDetail = data?.companyDetail || {};
    const companyApplication = companyDetail?.application || {};
    const companyEmployment = companyDetail?.employment || {};
    const companyEmployer = companyDetail?.employer || {};
    const companyAddress = companyDetail?.address || {};
    const completion = data?.completion || {};
    const line1 = currentAddress?.line1 || '';

    this.isReadOnly = !!data?.application?.personalTabLocked;
    this.isEmploymentStepCompleted =
      !!completion?.employmentDetailsCompleted || this.isEmploymentStepCompleted;
    this.currentAddressCompleted = !!completion?.currentAddressCompleted;
    this.isCurrentAddressDraft =
      !!currentAddress?.isPrefilledDraft || this.isPlaceholderAddress(line1);

    this.employmentForm.patchValue({
      employment: {
        employmentType: employment?.employmentType || 'SALARIED',
        netMonthlyIncome: employment?.netMonthlyIncome ?? '',
        nextSalaryDate: normalizeDateForInput(employment?.nextSalaryDate),
        modeOfIncome: employment?.modeOfIncome || '',
        existingEmiTotal: employment?.existingEmiTotal ?? '',
      },
      currentAddress: {
        line1,
        line2: currentAddress?.line2 || '',
        landmark: currentAddress?.landmark || '',
        pincode: currentAddress?.pincode || '',
        city: currentAddress?.city || '',
        state: currentAddress?.state || '',
        residenceType: currentAddress?.residenceType || '',
        residingSince: normalizeDateForInput(currentAddress?.residingSince),
      },
      companyDetail: {
        workingFromHome:
          this.normalizeBoolean(companyEmployment?.workingFromHome) ?? false,
        companyName: companyApplication?.companyName || '',
        companyType: companyApplication?.companyType || '',
        designation: companyEmployment?.designation || '',
        dateOfJoining: normalizeDateForInput(companyEmployment?.dateOfJoining),
        otherIncome: companyEmployment?.otherIncome ?? '',
        cin: companyEmployer?.cin || '',
        address: {
          line1: companyAddress?.line1 || '',
          line2: companyAddress?.line2 || '',
          landmark: companyAddress?.landmark || '',
          pincode: companyAddress?.pincode || '',
          city: companyAddress?.city || '',
          state: companyAddress?.state || '',
        },
      },
    });

    this.syncDateDisplays();

    this.employmentForm.enable({ emitEvent: false });
    this.initializeAddressLocationState(this.currentAddressGroup);
    this.initializeAddressLocationState(this.companyAddressGroup);

    if (this.isReadOnly) {
      this.employmentForm.disable({ emitEvent: false });
    }
  }

  onCurrentAddressPincodeInput() {
    this.resolveAddressPincode(this.currentAddressGroup);
  }

  onCompanyAddressPincodeInput() {
    this.resolveAddressPincode(this.companyAddressGroup);
  }

  control(path: string) {
    return this.employmentForm.get(path);
  }

  hasError(path: string, errorCode?: string): boolean {
    const control = this.control(path);

    if (!control) {
      return false;
    }

    const shouldShow = control.touched || this.submitted;

    if (!shouldShow) {
      return false;
    }

    if (errorCode) {
      return control.hasError(errorCode);
    }

    return control.invalid;
  }

  onDateInput(field: EmploymentDateField, event: Event) {
    const input = event.target as HTMLInputElement;
    const formattedValue = formatDateInput(input.value);

    input.value = formattedValue;
    this.dateDisplayValues[field] = formattedValue;
    this.dateDisplayErrors[field] = '';

    const normalizedValue = normalizeDateForInput(formattedValue);
    this.control(this.getDateControlPath(field))?.setValue(normalizedValue, {
      emitEvent: false,
    });
  }

  onDateBlur(field: EmploymentDateField) {
    const control = this.control(this.getDateControlPath(field));
    const displayValue = this.dateDisplayValues[field].trim();

    control?.markAsTouched();

    if (!displayValue) {
      this.dateDisplayErrors[field] = '';
      control?.setValue('', { emitEvent: false });
      control?.updateValueAndValidity({ emitEvent: false });
      return;
    }

    const normalizedValue = normalizeDateForInput(displayValue);

    if (!normalizedValue) {
      this.dateDisplayErrors[field] = 'Enter date in dd-MM-yyyy format';
      control?.setValue('', { emitEvent: false });
      control?.updateValueAndValidity({ emitEvent: false });
      return;
    }

    if (this.isFutureDateNotAllowed(field) && normalizedValue > this.today) {
      this.dateDisplayErrors[field] = 'Future date is not allowed';
      control?.setValue('', { emitEvent: false });
      control?.updateValueAndValidity({ emitEvent: false });
      return;
    }

    this.dateDisplayErrors[field] = '';
    this.dateDisplayValues[field] = formatDateForDisplay(normalizedValue);
    control?.setValue(normalizedValue, { emitEvent: false });
    control?.updateValueAndValidity({ emitEvent: false });
  }

  getDateDisplayValue(field: EmploymentDateField): string {
    return this.dateDisplayValues[field];
  }

  getDateErrorMessage(field: EmploymentDateField): string {
    const displayError = this.dateDisplayErrors[field];

    if (displayError) {
      return displayError;
    }

    const controlPath = this.getDateControlPath(field);

    if (this.hasError(controlPath, 'required')) {
      if (field === 'dateOfJoining') {
        return 'Previous salary date is required';
      }

      if (field === 'residingSince') {
        return 'Residing since is required';
      }
    }

    return '';
  }

  openNativeDatePicker(input: HTMLInputElement) {
    if (!input || input.disabled) {
      return;
    }

    const pickerInput = input as HTMLInputElement & {
      showPicker?: () => void;
    };

    if (typeof pickerInput.showPicker === 'function') {
      pickerInput.showPicker();
      return;
    }

    pickerInput.click();
  }

  onNativeDateChange(field: EmploymentDateField, event: Event) {
    const input = event.target as HTMLInputElement;
    const normalizedValue = normalizeDateForInput(input.value);
    const control = this.control(this.getDateControlPath(field));

    this.dateDisplayErrors[field] = '';
    this.dateDisplayValues[field] = formatDateForDisplay(normalizedValue);
    control?.setValue(normalizedValue, { emitEvent: false });
    control?.markAsTouched();
    control?.updateValueAndValidity({ emitEvent: false });
  }

  allowOnlyDigits(event: KeyboardEvent) {
    const allowedKeys = [
      'Backspace',
      'Tab',
      'ArrowLeft',
      'ArrowRight',
      'Delete',
    ];

    if (allowedKeys.includes(event.key)) {
      return;
    }

    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  blockTyping(event: KeyboardEvent) {
    const allowed = ['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete'];

    if (allowed.includes(event.key)) {
      return;
    }

    event.preventDefault();
  }

  get currentAddressGroup() {
    return this.employmentForm.get('currentAddress') as FormGroup;
  }

  get employmentGroup() {
    return this.employmentForm.get('employment') as FormGroup;
  }

  get companyDetailGroup() {
    return this.employmentForm.get('companyDetail') as FormGroup;
  }

  get companyAddressGroup() {
    return this.employmentForm.get('companyDetail.address') as FormGroup;
  }

  get workingFromHomeCtrl() {
    return this.employmentForm.get('companyDetail.workingFromHome');
  }

  private initializeAddressLocationState(addressGroup: FormGroup) {
    const pincode = this.normalizePincode(addressGroup.get('pincode')?.value);

    if (pincode.length === 6) {
      this.resolveAddressPincode(addressGroup);
      return;
    }

    this.setAddressControlsState(addressGroup, false, false);
  }

  private resolveAddressPincode(addressGroup: FormGroup) {
    const pincodeControl = addressGroup.get('pincode');
    const pincode = this.normalizePincode(pincodeControl?.value);

    pincodeControl?.setValue(pincode, { emitEvent: false });

    if (pincode.length !== 6) {
      addressGroup.patchValue(
        {
          city: '',
          state: '',
        },
        { emitEvent: false },
      );
      this.setAddressControlsState(addressGroup, false, false);
      return;
    }

    this.setAddressControlsState(addressGroup, false, false);

    this.contentService.resolvePincode(pincode).subscribe({
      next: (res: any) => {
        if (res?.success === false) {
          addressGroup.patchValue(
            {
              city: '',
              state: '',
            },
            { emitEvent: false },
          );
          this.setAddressControlsState(addressGroup, true, false);
          return;
        }

        const location = this.unwrapResponse(res);
        const hasCity = !!this.normalizeText(location?.city);

        addressGroup.patchValue(
          {
            city: this.normalizeText(location?.city) ?? '',
            state: this.normalizeText(location?.stateName ?? location?.state) ?? '',
          },
          { emitEvent: false },
        );

        if (this.isReadOnly) {
          this.setAddressControlsState(addressGroup, false, false);
          return;
        }

        this.setAddressControlsState(addressGroup, !hasCity, false);
      },
      error: () => {
        addressGroup.patchValue(
          {
            city: '',
            state: '',
          },
          { emitEvent: false },
        );
        this.setAddressControlsState(addressGroup, true, false);
        console.error('Pincode resolve failed');
      },
    });
  }

  private setAddressControlsState(
    addressGroup: FormGroup,
    cityEditable: boolean,
    stateEditable: boolean,
  ) {
    const cityControl = addressGroup.get('city');
    const stateControl = addressGroup.get('state');

    if (cityEditable && !this.isReadOnly) {
      cityControl?.enable({ emitEvent: false });
    } else {
      cityControl?.disable({ emitEvent: false });
    }

    if (stateEditable && !this.isReadOnly) {
      stateControl?.enable({ emitEvent: false });
    } else {
      stateControl?.disable({ emitEvent: false });
    }
  }

  private buildPayload() {
    const rawValue = this.employmentForm.getRawValue();

    return {
      applicationId: this.applicationId,
      employment: {
        employmentType: this.normalizeText(rawValue?.employment?.employmentType),
        netMonthlyIncome: this.normalizeNumber(rawValue?.employment?.netMonthlyIncome),
        nextSalaryDate: this.normalizeText(rawValue?.employment?.nextSalaryDate),
        modeOfIncome: this.normalizeText(rawValue?.employment?.modeOfIncome),
        existingEmiTotal: this.normalizeNumber(rawValue?.employment?.existingEmiTotal),
      },
      currentAddress: {
        line1: this.normalizeText(rawValue?.currentAddress?.line1),
        line2: this.normalizeText(rawValue?.currentAddress?.line2),
        landmark: this.normalizeText(rawValue?.currentAddress?.landmark),
        pincode: this.normalizePincode(rawValue?.currentAddress?.pincode),
        city: this.normalizeText(rawValue?.currentAddress?.city),
        state: this.normalizeText(rawValue?.currentAddress?.state),
        residenceType: this.normalizeText(rawValue?.currentAddress?.residenceType),
        residingSince: this.normalizeText(rawValue?.currentAddress?.residingSince),
      },
      companyDetail: {
        companyName: this.normalizeText(rawValue?.companyDetail?.companyName),
        companyType: this.normalizeText(rawValue?.companyDetail?.companyType),
        designation: this.normalizeText(rawValue?.companyDetail?.designation),
        dateOfJoining: this.normalizeText(rawValue?.companyDetail?.dateOfJoining),
        otherIncome: this.normalizeNumber(rawValue?.companyDetail?.otherIncome),
        workingFromHome: this.normalizeBoolean(rawValue?.companyDetail?.workingFromHome),
        cin: this.normalizeText(rawValue?.companyDetail?.cin),
        address: {
          line1: this.normalizeText(rawValue?.companyDetail?.address?.line1),
          line2: this.normalizeText(rawValue?.companyDetail?.address?.line2),
          landmark: this.normalizeText(rawValue?.companyDetail?.address?.landmark),
          pincode: this.normalizePincode(rawValue?.companyDetail?.address?.pincode),
          city: this.normalizeText(rawValue?.companyDetail?.address?.city),
          state: this.normalizeText(rawValue?.companyDetail?.address?.state),
        },
      },
    };
  }

  private unwrapResponse(res: any) {
    if (res && typeof res === 'object' && 'data' in res) {
      return res.data;
    }

    return res;
  }

  private resolveNextActionCode(nextAction: any): string {
    if (typeof nextAction === 'string') {
      return nextAction;
    }

    return (
      nextAction?.code ||
      nextAction?.name ||
      nextAction?.action ||
      ''
    );
  }

  private normalizeText(value: any): string | null {
    const trimmedValue = String(value ?? '').trim();
    return trimmedValue ? trimmedValue : null;
  }

  private normalizeNumber(value: any): number | null {
    if (value === '' || value === null || value === undefined) {
      return null;
    }

    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  private normalizeBoolean(value: any): boolean | null {
    if (value === true || value === false) {
      return value;
    }

    return null;
  }

  private normalizePincode(value: any): string {
    return String(value ?? '')
      .replace(/\D/g, '')
      .slice(0, 6);
  }

  private isPlaceholderAddress(value: any): boolean {
    return PLACEHOLDER_ADDRESS_VALUES.has(normalizePlaceholderToken(value));
  }

  private getDateControlPath(field: EmploymentDateField): string {
    const fieldMap: Record<EmploymentDateField, string> = {
      nextSalaryDate: 'employment.nextSalaryDate',
      residingSince: 'currentAddress.residingSince',
      dateOfJoining: 'companyDetail.dateOfJoining',
    };

    return fieldMap[field];
  }

  private isFutureDateNotAllowed(field: EmploymentDateField): boolean {
    return field === 'residingSince' || field === 'dateOfJoining';
  }

  private syncDateDisplays() {
    this.dateDisplayValues.nextSalaryDate = formatDateForDisplay(
      this.control('employment.nextSalaryDate')?.value,
    );
    this.dateDisplayValues.residingSince = formatDateForDisplay(
      this.control('currentAddress.residingSince')?.value,
    );
    this.dateDisplayValues.dateOfJoining = formatDateForDisplay(
      this.control('companyDetail.dateOfJoining')?.value,
    );

    this.dateDisplayErrors.nextSalaryDate = '';
    this.dateDisplayErrors.residingSince = '';
    this.dateDisplayErrors.dateOfJoining = '';
  }
}
