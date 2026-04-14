import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiEndPoint } from '../enums/api-end-point';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthServiceService {
  private readonly loginLocationKey = 'loginLocation';
  private readonly loginFlowKeys = ['loginPhone', 'loginMobile', 'otpTimer'];
  private locationRequestPromise: Promise<{ lat: number; long: number }> | null =
    null;
  private currentUserSubject: BehaviorSubject<any>;
  public currentUser$: Observable<any>;

  constructor(private http: HttpClient) {
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

  private getCurrentPosition(options?: PositionOptions) {
    return new Promise<{ lat: number; long: number }>((resolve, reject) => {
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
        options,
      );
    });
  }

  clearLoginFlowData(preserveLocation = true) {
    this.loginFlowKeys.forEach((key) => localStorage.removeItem(key));

    if (!preserveLocation) {
      this.clearLoginLocation();
    }
  }

  logout(options?: { preserveLoginLocation?: boolean }) {
    const preserveLoginLocation = options?.preserveLoginLocation ?? true;

    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this.clearLoginFlowData(preserveLoginLocation);

    sessionStorage.clear();

    this.locationRequestPromise = null;
    this.currentUserSubject.next(null);
  }

  async prefetchLocationIfAvailable() {
    if (this.getSavedLoginLocation() || this.locationRequestPromise) {
      return;
    }

    if (
      typeof navigator === 'undefined' ||
      !navigator.geolocation ||
      !navigator.permissions?.query
    ) {
      return;
    }

    try {
      const permissionStatus = await navigator.permissions.query({
        name: 'geolocation' as PermissionName,
      });

      if (permissionStatus.state !== 'granted') {
        return;
      }

      await this.requestCurrentLocation();
    } catch {
      // Silent prefetch: login flow will handle visible errors if user action needs it.
    }
  }

  requestCurrentLocation(
    forceRefresh = false,
  ): Promise<{ lat: number; long: number }> {
    const savedLocation = !forceRefresh ? this.getSavedLoginLocation() : null;
    if (savedLocation) {
      return Promise.resolve(savedLocation);
    }

    if (this.locationRequestPromise) {
      return this.locationRequestPromise;
    }

    const requestPromise = new Promise<{ lat: number; long: number }>(
      async (resolve, reject) => {
        try {
          const quickLocation = await this.getCurrentPosition({
            enableHighAccuracy: false,
            timeout: 4000,
            maximumAge: 900000,
          });
          resolve(quickLocation);
        } catch (error: any) {
          if (error?.code === error?.PERMISSION_DENIED) {
            reject(error);
            return;
          }

          try {
            const preciseLocation = await this.getCurrentPosition({
              enableHighAccuracy: true,
              timeout: 8000,
              maximumAge: 300000,
            });
            resolve(preciseLocation);
          } catch (fallbackError) {
            reject(fallbackError);
          }
        }
      },
    ).finally(() => {
      this.locationRequestPromise = null;
    });

    this.locationRequestPromise = requestPromise;
    return requestPromise;
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
