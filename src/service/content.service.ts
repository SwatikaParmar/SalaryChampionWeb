import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ApiEndPoint } from '../enums/api-end-point';
import { environment } from '../environments/environment';
@Injectable({
  providedIn: 'root',
})
export class ContentService {
  private noAuthHttp: HttpClient;

  constructor(private http: HttpClient, private handler: HttpBackend) {
    this.noAuthHttp = new HttpClient(handler);
  }

  previewPan(data: any) {
    return this.http.post<any>(
      environment.apiUrl + ApiEndPoint.previewPan,
      data
    );
  }

  verifyPan(data: any) {
    return this.http.post<any>(
      environment.apiUrl + ApiEndPoint.verifyPan,
      data
    );
  }

  saveBasicDetail(data: any) {
    return this.http.post<any>(
      environment.apiUrl + ApiEndPoint.saveBasicDetail,
      data
    );
  }

  getBorrowerSnapshot() {
    return this.http.get<any>(
      environment.apiUrl + ApiEndPoint.borrowerSnapshot
    );
  }

  saveAddressDetail(data: any) {
    return this.http.post<any>(
      environment.apiUrl + ApiEndPoint.saveAddressDetail,
      data
    );
  }

  resolvePincode(pincode: string) {
    return this.http.get<any>(
      `${environment.apiUrl}${ApiEndPoint.resolvePincode}/${pincode}/resolve`
    );
  }

  saveIncomeDetail(data: any) {
    return this.http.post<any>(
      environment.apiUrl + ApiEndPoint.saveIncomeDetail,
      data
    );
  }

  // STEP 1: get signed url
  imageUploadMeta(data: any) {
    return this.http.post<any>(
      environment.apiUrl + ApiEndPoint.imageUpload,
      data
    );
  }

  // STEP 2: upload file to S3
  // STEP 2: PUT to S3 WITH HEADERS
  uploadToS3(upload: any, file: Blob) {
    return this.http.put(upload.url, file, {
      headers: upload.headers, // 🔥 IMPORTANT
      responseType: 'text', // 🔥 S3 returns empty XML
    });
  }

  completeUpload(fileId: string) {
    return this.http.post<any>(
      environment.apiUrl + ApiEndPoint.completeUpload,
      { fileId } // ✅ backend expects object
    );
  }

  // loan application

  emiLoanQuote(data: any) {
    return this.http.post<any>(
      environment.apiUrl + ApiEndPoint.emiLoanQuote,
      data
    );
  }

  accetLoanDecision(data: any) {
    return this.http.post<any>(
      environment.apiUrl + ApiEndPoint.acceptLoan,
      data
    );
  }

  postEmploymentDetail(data: any) {
    return this.http.post<any>(
      environment.apiUrl + ApiEndPoint.postEmploymentDetail,
      data
    );
  }


  ekycStart(id:any){
    return this.http.post<any>(environment.apiUrl + ApiEndPoint.ekycStart,id)
  }

 checkEligibility() {
  return this.http.post<any>(
    environment.apiUrl + ApiEndPoint.checkEligibility,
    null   // 👈 body empty
  );
}


fetchBankStatement(data: any) {
  return this.http.post(
    environment.apiUrl + ApiEndPoint.fetchBankStatement,
    data,
    {
      responseType: 'text' as 'json' // 🔥 IMPORTANT FIX
    }
  );
}

documentCheckList(applicationId :any){
  return this.http.get<any>(environment.apiUrl + ApiEndPoint.documentCheckList + '?applicationId=' + applicationId )

}


// content.service.ts
uploadDocumentMeta(data: any) {
  return this.http.post<any>(
    environment.apiUrl + ApiEndPoint.UploadDocument,
    data
  );
}

disbursalBankAccount(data:any){
  return this.http.post<any>(environment.apiUrl + ApiEndPoint.disbursalBankAccount,data)
}


getDisbursalBankStatement(applicationId:any){
return this.http.get<any>(environment.apiUrl + ApiEndPoint.getDisbursalBankStatement + '?applicationId=' + applicationId)
}


saveReference(data:any){
  return this.http.post<any>(environment.apiUrl + ApiEndPoint.saveReference,data)
}


verifyEkyc(data:any){
  return this.http.post<any>(environment.apiUrl + ApiEndPoint.verifyEkyc,data)
}

pennyDrop(data:any){
  return this.http.post<any>(environment.apiUrl + ApiEndPoint.pennyDrop,data)
}

verifyBank(id: any) {
  const url = ApiEndPoint.verifyBank.replace('{id}', id);
  return this.http.get<any>(environment.apiUrl + url);
}


saveBasic(data:any){
return this.http.post<any>(environment.apiUrl + ApiEndPoint.saveBasic,data)
}






  // ================= 5. APPLICATION SNAPSHOT =================
  getApplicationSnapshot(applicationId: string) {
    return this.http.get<any>(
      `${environment.apiUrl}loan/applicationSnapshot?applicationId=${applicationId}`,
    );
  }

  // ================= 6. REVOKE CONSENT (FALLBACK) =================
  revokeConsent(consentId: string) {
    return this.http.post<any>(
      `${environment.apiUrl}kyc/aa/consents/${consentId}/revoke`,
      {},
    );
  }


  skipFetchBankStatement(applicationId: string) {
  return this.http.post<any>(
    `${environment.apiUrl}loan/borrower/fetch-bank-statement/skip`,
    {
      applicationId: applicationId,
      skip: true
    },
  );
}


// 1. REQUEST OTP
requestPanOtp(data: any) {
  return this.http.post<any>(
    environment.apiUrl + 'loan/public/repay/pan/request-otp',
    data
  );
}

// 2. VERIFY OTP
verifyPanOtp(data: any) {
  return this.http.post<any>(
    environment.apiUrl + 'loan/public/repay/pan/verify-otp',
    data
  );
}

// 3. CREATE ORDER
createRepaymentOrder(data: any) {
  return this.http.post<any>(
    environment.apiUrl + 'loan/public/repay/pan/cashfree/order',
    data
  );
}

// 4. REFRESH STATUS
refreshPayment(data: any) {
  return this.http.post<any>(
    environment.apiUrl + 'loan/public/repay/pan/cashfree/refresh',
    data
  );
}

applicationStatus(applicationId: any) {
  return this.http.get<any>(
    environment.apiUrl + ApiEndPoint.applicationStatus + '?applicationId=' + applicationId
  );
}

startVideoKyc(payload: any) {
  return this.http.post<any>(
    environment.apiUrl + ApiEndPoint.videoKycInitiate,
    payload
  );
}

videoRefresh(applicationId:any){
  return this.http.post<any>(environment.apiUrl + ApiEndPoint.videoRefresh,applicationId)
}


// content.service.ts

sanctionEsignLink(applicationId : any) {
  return this.http.get<any>(
    environment.apiUrl + ApiEndPoint.sanctionEsignLink + '?applicationId=' + applicationId
    
  );
}

acceptSanction(payload: any) {
  return this.http.post<any>(
    environment.apiUrl + 'loan/borrower/sanction/accept',
    payload
  );
}


esignLink(applicationId: string) {
  return this.http.get<any>(
    environment.apiUrl + ApiEndPoint.esignLink + '?applicationId=' + applicationId
  );
}



createMandate(payload: any) {
  return this.http.post<any>(
    environment.apiUrl + ApiEndPoint.createMandate,
    payload
  );
}

mendateRefresh(data:any){
  return this.http.post<any>(environment.apiUrl + ApiEndPoint.mendateRefresh,data)

}

disbursement(data: any) {
  return this.http.post<any>(
    environment.apiUrl + ApiEndPoint.disbursement,
    data
  );
}






skipSalarySlip(applicationId: string) {
  return this.http.post<any>(
    environment.apiUrl + ApiEndPoint.skipSalarySlip,
    {
      applicationId: applicationId,
      skip: true
    }
  );
}



buildUrl(url: string): string {
  const base = environment.apiUrl.replace(/\/+$/, '');
  const clean = url.replace(/^\/+/, '');
  return `${base}/${clean}`;
}

// ================= CONSENT =================
createConsent(payload: any) {
  return this.http.post(this.buildUrl('kyc/aa/consents'), payload);
}

getConsentStatus(consentId: string) {
  return this.http.get(
    this.buildUrl(`kyc/aa/consents/${consentId}`)
  );
}

// ================= FETCH =================
getFetchStatus(consentId: string) {
  return this.http.get(
    this.buildUrl(`kyc/aa/consents/${consentId}/fetch-status`)
  );
}

// ================= SESSIONS =================
getSessions(consentId: string) {
  return this.http.get(
    this.buildUrl(`kyc/aa/consents/${consentId}/sessions`)
  );
}

createSession(payload: any) {
  return this.http.post(
    this.buildUrl('kyc/aa/sessions'),
    payload
  );
}

getSessionStatus(sessionId: string, applicationId: string) {
  return this.http.get(
    this.buildUrl(`kyc/aa/sessions/${sessionId}?applicationId=${applicationId}`)
  );
}

}
