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
}
