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
  private readonly loginLocationKey = 'loginLocation';
  private currentUserSubject: BehaviorSubject<any>;
  public currentUser$: Observable<any>;

  constructor(private http: HttpClient, private router: Router) {
    const userData = JSON.parse(localStorage.getItem('user') || 'null');
    this.currentUserSubject = new BehaviorSubject<any>(userData);
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): any {
    return this.currentUserSubject.value;
  }

  setCurrentUser(user: any) {
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  saveLoginLocation(lat: number, long: number) {
    localStorage.setItem(this.loginLocationKey, JSON.stringify({ lat, long }));
  }

  getSavedLoginLocation(): { lat: number; long: number } | null {
    const savedLocation = localStorage.getItem(this.loginLocationKey);

    if (!savedLocation) {
      return null;
    }

    try {
      return JSON.parse(savedLocation);
    } catch {
      localStorage.removeItem(this.loginLocationKey);
      return null;
    }
  }

  clearLoginLocation() {
    localStorage.removeItem(this.loginLocationKey);
  }

  requestCurrentLocation(): Promise<{ lat: number; long: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            long: position.coords.longitude,
          };

          this.saveLoginLocation(location.lat, location.long);
          resolve(location);
        },
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      );
    });
  }

  otp(data: any) {
    return this.http.post<any>(environment.apiUrl + ApiEndPoint.otp, data);
  }

  deviceRegister(data: any) {
    return this.http.post<any>(
      environment.apiUrl + ApiEndPoint.deviceRegister,
      data,
    );
  }

  verifyOtp(otp: any) {
    return this.http.post<any>(environment.apiUrl + ApiEndPoint.verifyOtp, otp);
  }
}
