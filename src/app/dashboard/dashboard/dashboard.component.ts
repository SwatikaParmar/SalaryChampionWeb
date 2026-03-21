import { Component, OnInit } from '@angular/core';
import { ContentService } from '../../../service/content.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {

  // flags
  isProfileComplete = false;

  // progress values
  profileProgress = 0;
  loanProgress = 0;
  overallProgress = 0;


  isEligible: boolean = true;
ineligibleReason: string = '';
retryDate: string = '';

trackingSteps: any = {};
currentTitle: string = '';
currentMessage: string = '';

hasActiveApplication: boolean = false;


showLoanCard: boolean = false;
showTracker: boolean = false;

showKycModal: boolean = false;
kycUrl: string = '';
kycUrlSafe!: SafeResourceUrl;
  creditManager: any;
  to: any;

  constructor(
    private contentService: ContentService,
    private spinner: NgxSpinnerService,   // ✅ spinner inject
      private sanitizer: DomSanitizer,
      private toastr : ToastrService

  ) {}

  ngOnInit(): void {
    this.getBorrowerSnapshot();
  }

getBorrowerSnapshot() {
  this.spinner.show();

  this.contentService.getBorrowerSnapshot().subscribe({
    next: (res: any) => {
      this.spinner.hide();

      if (!res?.success) return;

      const data = res.data;
debugger
      // ✅ IDs
      this.applicationId = data?.application?.id;

      // ✅ Progress
      this.profileProgress = data.basicFlow?.percent || 0;
      this.loanProgress = data.applicationFlow?.percent || 0;

      
      // ===============================
      // 🔥 CREDIT MANAGER FROM assignedRoleDetails[0]
      // ===============================
      const roles = data?.loanTracking?.assignedRoleDetails;

      if (roles && roles.length > 0) {
        const cm = roles[0]; // 👈 FIRST ITEM

        this.creditManager = {
          name: cm?.name,
          mobile: cm?.phone || cm?.contact,
          email: cm?.email,
          role: cm?.roleName
        };
      } else {
        this.creditManager = null;
      }

      // ✅ UI Control
      this.showLoanCard =
        this.profileProgress === 100 && this.loanProgress < 100;

      this.showTracker =
        this.loanProgress === 100;

      // ❌ REMOVE THIS (important)
      // this.trackingSteps = tracking?.steps;

      // ✅ CALL REAL STATUS API
      if (this.showTracker) {
        this.applicationStatusApi();
      }
    },
    error: () => {
      this.spinner.hide();
    }
  });
}


getStepIcon(step: string, status: string) {

  // ✅ DONE → green tick
  if (status === 'DONE') return 'fa-check';

  // 🔒 LOCKED → lock icon
  if (status === 'LOCKED') return 'fa-lock';

  // 🟡 PENDING → step wise icon
  switch (step) {
    case 'applicationSubmitted': return 'fa-file';
    case 'applicationInReview': return 'fa-user-check';
    case 'videoKyc': return 'fa-video';
    case 'sanction': return 'fa-landmark';
    case 'esign': return 'fa-file-signature';

    // 🔥 ADD THIS
    case 'enach': return 'fa-building-columns';  // or fa-university / fa-bank

    case 'disbursement': return 'fa-indian-rupee-sign';

    default: return 'fa-circle';
  }
}


getStepClass(status: string) {
  if (status === 'DONE') return 'done';
  if (status === 'PENDING') return 'active';
  return 'locked';
}


applicationId: string = '';
videoKycData: any = null;

applicationStatusApi() {
  if (!this.applicationId) return;

  this.spinner.show();

  this.contentService.applicationStatus(this.applicationId).subscribe({
    next: (res: any) => {
      this.spinner.hide();

      if (!res?.success) return;

      const data = res.data;

      // ✅ 🔥 REAL STEPS (IMPORTANT)
      this.trackingSteps = data?.steps || {};

      // ✅ MESSAGE
      this.currentTitle = data?.borrowerGuidance?.title || '';
      this.currentMessage = data?.borrowerGuidance?.message || '';

      // ✅ VIDEO KYC
      this.videoKycData = data?.videoKyc;

    },
    error: () => {
      this.spinner.hide();
      console.error('Application status failed');
    }
  });
}
async startVideoKyc() {
  if (!this.applicationId) return;

  // ✅ पहले permission लो
  const allowed = await this.ensureLocationAccess();
  if (!allowed) return;

  this.spinner.show();

  this.contentService.startVideoKyc({
    applicationId: this.applicationId
  }).subscribe({
    next: (res: any) => {
      this.spinner.hide();

      const url = res?.data?.videoKyc?.customerUrl;

      if (res?.success && url) {

        this.kycUrl = url;
        this.kycUrlSafe =
          this.sanitizer.bypassSecurityTrustResourceUrl(url);

        this.showKycModal = true;

      } else {
        this.toastr.error('KYC URL not found');
      }
    },
    error: () => {
      this.spinner.hide();
      this.toastr.error('Video KYC failed');
    }
  });
}


async ensureLocationAccess(): Promise<boolean> {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      () => {
        this.toastr.error('Please allow location to continue KYC');
        resolve(false);
      }
    );
  });
}

onVideoKycClick() {
decodeURI
  // ❌ agar locked hai toh kuch mat karo
  if (this.trackingSteps?.videoKyc === 'LOCKED') return;

  // ✅ agar already done hai toh bhi kuch mat karo
  if (this.trackingSteps?.videoKyc === 'DONE') return;

  // ✅ sirf PENDING pe call karo
  if (this.trackingSteps?.videoKyc === 'PENDING') {
    this.startVideoKyc();
  }
}

requestLocationPermission(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      this.toastr.error('Location not supported');
      resolve(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('Location allowed:', pos.coords);
        resolve(true);
      },
      (err) => {
        console.error('Location denied', err);

        this.to.error('Please allow location for Video KYC');

        resolve(false);
      }
    );
  });
}

closeKycModal() {
  this.showKycModal = false;

  // 🔥 CALL REFRESH API
  this.videoKycRefresh();
}

videoKycRefresh() {
  if (!this.applicationId) return;

  const payload = {
    applicationId: this.applicationId
  };

  this.contentService.videoRefresh(payload).subscribe({
    next: (res: any) => {
      console.log('KYC refreshed');

      // 🔥 TRACKER UPDATE AGAIN
      this.applicationStatusApi();
    },
    error: () => {
      console.error('Refresh failed');
    }
  });
}



showSanctionModal: boolean = false;
sanctionUrl: string = '';
sanctionUrlSafe!: SafeResourceUrl;

otpData: any = null;
enteredOtp: any;
openSanctionLetter() {
  if (!this.applicationId) return;

  this.spinner.show();

  this.contentService.sanctionEsignLink(this.applicationId).subscribe({
    next: (res: any) => {
      this.spinner.hide();

      const url = res?.data?.sanctionLetterUrl;

      if (res?.success && url) {

        // 🔥 DIRECT SAFE URL (NO FETCH)
        this.sanctionUrlSafe =
          this.sanitizer.bypassSecurityTrustResourceUrl(url);

        this.showSanctionModal = true;

        this.otpData = res?.data?.otp;

      } else {
        console.error('Sanction URL not found');
      }
    },
    error: () => {
      this.spinner.hide();
    }
  });
}

acceptSanction(otp: string) {

  const payload = {
    applicationId: this.applicationId,
    otpCode: otp
  };

  this.spinner.show();

  this.contentService.acceptSanction(payload).subscribe({
    next: (res: any) => {
      this.spinner.hide();

      if (res?.success) {

        this.showSanctionModal = false;

        // 🔥 refresh tracker
        this.applicationStatusApi();

      }
    },
    error: () => {
      this.spinner.hide();
    }
  });
}




showEsignModal: boolean = false;
esignUrlSafe!: SafeResourceUrl;
esignUrl: string = '';

openEsign() {
  if (!this.applicationId) return;

  this.spinner.show();

  this.contentService.esignLink(this.applicationId).subscribe({
    next: (res: any) => {
      this.spinner.hide();

      const url = res?.data?.esignUrl || res?.data?.redirectUrl;

      if (res?.success && url) {

        // ⚠️ same issue like sanction (iframe block ho sakta hai)
        this.esignUrl = url;
        this.esignUrlSafe =
          this.sanitizer.bypassSecurityTrustResourceUrl(url);

        this.showEsignModal = true;

        // 👉 fallback (recommended)
        // window.open(url, '_blank');

      } else {
        console.error('eSign URL not found');
      }
    },
    error: () => {
      this.spinner.hide();
    }
  });
}


closeEsignModal() {
  this.showEsignModal = false;

  // 🔥 refresh tracker
  this.applicationStatusApi();
}

openEsignInNewTab() {
  if (this.esignUrl) {
    window.open(this.esignUrl, '_blank');
  }
}
showEnachModal: boolean = false;
enachUrlSafe!: SafeResourceUrl;
enachUrl: string = '';

mandateRowId: string = '';

openEnach() {
  if (!this.applicationId) return;

  const payload = {
    applicationId: this.applicationId
  };

  this.spinner.show();

  this.contentService.createMandate(payload).subscribe({
    next: (res: any) => {
      this.spinner.hide();

      if (!res?.success) return;

      const url = res?.data?.authUrl;

      // 🔥 STORE mandateRowId
      this.mandateRowId = res?.data?.mandateRowId;

      if (url) {
        this.enachUrl = url;

        this.enachUrlSafe =
          this.sanitizer.bypassSecurityTrustResourceUrl(url);

        this.showEnachModal = true;

      } else {
        console.error('Mandate URL not found');
      }
    },
    error: () => {
      this.spinner.hide();
    }
  });
}


verifyEnach() {
  if (!this.mandateRowId) {
    console.error('Mandate ID missing');
    return;
  }

  const payload = {
    mandateRowId: this.mandateRowId
  };

  this.spinner.show();

  this.contentService.mendateRefresh(payload).subscribe({
    next: (res: any) => {
      this.spinner.hide();

      if (!res?.success) return;

      // ✅ modal close
      this.showEnachModal = false;

      // 🔥 tracker refresh
      this.applicationStatusApi();

    },
    error: () => {
      this.spinner.hide();
      console.error('Mandate refresh failed');
    }
  });
}



openEnachInNewTab() {
  if (this.enachUrl) {
    window.open(this.enachUrl, '_blank');
  }
}

}
