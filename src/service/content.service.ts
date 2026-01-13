import {
  HttpBackend,
  HttpClient,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
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


  previewPan(data:any){
    return this.http.post<any>(environment.apiUrl + ApiEndPoint.previewPan,data)

  }

  verifyPan(data:any){
    return this.http.post<any>(environment.apiUrl + ApiEndPoint.verifyPan,data)
  }

}
