import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiEndPoint } from '../enums/api-end-point';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthServiceService {
  private currentUserSubject: BehaviorSubject<any>;
  public currentUser$: Observable<any>; // observable you can subscribe to

  constructor(private http: HttpClient, private router: Router) {
    const userData = JSON.parse(localStorage.getItem('currentUser') || 'null');
    this.currentUserSubject = new BehaviorSubject<any>(userData);
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): any {
    return this.currentUserSubject.value;
  }

  otp(data: any) {
    return this.http.post<any>(environment.apiUrl + ApiEndPoint.otp, data);
  }

  verifyOtp(otp:any){
    return this.http.post<any>(environment.apiUrl + ApiEndPoint.otp, otp);

  }
}
