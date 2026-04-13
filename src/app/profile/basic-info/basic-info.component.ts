import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ContentService } from '../../../service/content.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { getFirstApiErrorMessage } from '../../../service/api-error.util';
@Component({
  selector: 'app-basic-info',
  templateUrl: './basic-info.component.html',
  styleUrl: './basic-info.component.css',
})
export class BasicInfoComponent implements OnInit {
  basicForm!: FormGroup;
  isMarried = false;

  constructor(
    private fb: FormBuilder,
    private contentService: ContentService,
    private router: Router,
       private spinner: NgxSpinnerService,   // ✅ spinner
    private toastr: ToastrService         // ✅ toaster
  ) {}

  ngOnInit(): void {
this.basicForm = this.fb.group({
  employmentType: ['', Validators.required],
  modeOfSalaryReceived: ['', Validators.required],
  residenceType: ['', Validators.required],
  dob: ['', Validators.required],
  gender: ['', Validators.required],
  pincode: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
  personalEmail: [
    '',
    [
      Validators.required,
      Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/)
    ]
  ],
  officialEmail: [
    ''
  ]
});

    this.getBorrowerSnapshot();
    this.watchMaritalStatus();
  }

  // 🔥 MAIN SOURCE OF DATA
  getBorrowerSnapshot() {
    this.contentService.getBorrowerSnapshot().subscribe({
      next: (res: any) => {
        if (res?.success && res?.data?.user) {
          this.patchBasicData(res.data.user);
          this.patchBorrowerData(res.data.user);
        }
      },
      error: (err) => {
        console.error('Failed to fetch borrower snapshot');
      },
    });
  }

  patchBasicData(data:any){

const formattedDob = data?.dob?.split('T')[0];

this.basicForm.patchValue({
  employmentType: data.employmentType,
  modeOfSalaryReceived: data.modeOfSalaryReceived,
  residenceType: data.residenceType,
  dob: formattedDob,
  gender: data.gender,
  pincode: data.pincode,
  personalEmail: data.personalEmail,
  officialEmail: data.officialEmail
});

}


  // 🔐 PATCH + LOCK PAN VERIFIED DATA
  patchBorrowerData(user: any) {
    debugger
  // Ensure YYYY-MM-DD
  const formattedDob = user.dob.split('T')[0];

  this.basicForm.patchValue({
    dob: formattedDob
  });
    this.basicForm.patchValue({
      name: user.name,
      gender: user.gender,
      maritalStatus: user.maritalStatus || '',
      email: user.email,
      spouseName: user.spouseName,
      spouseOccupation: user.spouseOccupation,
    });

    // 🔒 Lock PAN verified fields
    if (user.pan?.isValid) {
      this.basicForm.get('name')?.disable();
      this.basicForm.get('dob')?.disable();
      this.basicForm.get('gender')?.disable();
    }

    this.isMarried = user.maritalStatus === 'MARRIED';
  }

  watchMaritalStatus() {
    this.basicForm.get('maritalStatus')?.valueChanges.subscribe((value) => {
      this.isMarried = value === 'MARRIED';

      if (this.isMarried) {
        this.basicForm.get('spouseName')?.setValidators(Validators.required);
        this.basicForm
          .get('spouseOccupation')
          ?.setValidators(Validators.required);
      } else {
        this.basicForm.patchValue({
          spouseName: '',
          spouseOccupation: '',
        });
        this.basicForm.get('spouseName')?.clearValidators();
        this.basicForm.get('spouseOccupation')?.clearValidators();
      }

      this.basicForm.get('spouseName')?.updateValueAndValidity();
      this.basicForm.get('spouseOccupation')?.updateValueAndValidity();
    });
  }

submit() {

const f = this.basicForm.controls;

if (!f['employmentType'].value) {
  this.toastr.warning('Please select employment type');
  return;
}

if (!f['modeOfSalaryReceived'].value) {
  this.toastr.warning('Please select salary mode');
  return;
}

if (!f['residenceType'].value) {
  this.toastr.warning('Please select residence type');
  return;
}

if (!f['dob'].value) {
  this.toastr.warning('Please select date of birth');
  return;
}

if (!f['gender'].value) {
  this.toastr.warning('Please select gender');
  return;
}

if (f['pincode'].invalid) {
  this.toastr.warning('Enter valid 6 digit pincode');
  return;
}

if (f['personalEmail'].invalid) {
  this.toastr.warning('Enter valid personal email');
  return;
}


const payload = this.basicForm.getRawValue();

this.spinner.show();

this.contentService.saveBasic(payload).subscribe({

next:(res:any)=>{

this.spinner.hide();

if(res?.success){
  this.checkEligibility();
this.toastr.success('Basic details saved');
}else{
this.toastr.error(getFirstApiErrorMessage(res, 'Failed to save basic details'));
}

},

error:(err)=>{
this.spinner.hide();
this.toastr.error(getFirstApiErrorMessage(err, 'Failed to save basic details'));
}

})

}


  checkEligibility() {
    // ✅ START spinner
    this.spinner.show();

    this.contentService.checkEligibility().subscribe({
      next: (res) => {
        // ✅ STOP spinner
        this.spinner.hide();
debugger
         this.handleEligibilityResponse(res);

      },

      error: (err) => {
        // ✅ STOP spinner
        this.spinner.hide();
        this.router.navigate(['/dashboard/profile/error-eligibility'], {
          state: { message: getFirstApiErrorMessage(err) },
        });
      },
    });
  }

  handleEligibilityResponse(res: any) {
  const decision = res?.data?.decision;
debugger
  if (decision === 'ELIGIBLE') {
    // ✅ success page
    this.router.navigate(['/dashboard/profile/success-eligibility']);

  } else if (decision === 'NOT_ELIGIBLE') {
    // ❌ error page
     this.router.navigate(['/dashboard/profile/error-eligibility'], {
      state: { message: getFirstApiErrorMessage(res) }
    });
  }
}

}
