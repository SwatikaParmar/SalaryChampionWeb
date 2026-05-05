import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiEndPoint } from '../enums/api-end-point';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthServiceService {
  private readonly loginLocationKey = 'loginLocation';
  private readonly lastProtectedRouteKey = 'lastProtectedRoute';
  private readonly loginFlowKeys = ['loginPhone', 'loginMobile', 'otpTimer'];
  private locationRequestPromise: Promise<{ lat: number; long: number }> | null =
    null;
  private currentUserSubject: BehaviorSubject<any>;
  public currentUser$: Observable<any>;
  private readonly isBrowser: boolean;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    const userData = this.getStoredJson('user');
    this.currentUserSubject = new BehaviorSubject<any>(userData);
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): any {
    return this.currentUserSubject.value;
  }

  private getStoredItem(key: string): string | null {
    if (!this.isBrowser || typeof localStorage === 'undefined') {
      return null;
    }

    return localStorage.getItem(key);
  }

  private setStoredItem(key: string, value: string) {
    if (!this.isBrowser || typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(key, value);
  }

  private removeStoredItem(key: string) {
    if (!this.isBrowser || typeof localStorage === 'undefined') {
      return;
    }

    localStorage.removeItem(key);
  }

  private getSessionStoredItem(key: string): string | null {
    if (!this.isBrowser || typeof sessionStorage === 'undefined') {
      return null;
    }

    return sessionStorage.getItem(key);
  }

  private setSessionStoredItem(key: string, value: string) {
    if (!this.isBrowser || typeof sessionStorage === 'undefined') {
      return;
    }

    sessionStorage.setItem(key, value);
  }

  private removeSessionStoredItem(key: string) {
    if (!this.isBrowser || typeof sessionStorage === 'undefined') {
      return;
    }

    sessionStorage.removeItem(key);
  }

  private getStoredJson(key: string) {
    const value = this.getStoredItem(key);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch {
      this.removeStoredItem(key);
      return null;
    }
  }

  setCurrentUser(user: any) {
    this.setStoredItem('user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  saveLoginLocation(lat: number, long: number) {
    this.setStoredItem(this.loginLocationKey, JSON.stringify({ lat, long }));
  }

  getSavedLoginLocation(): { lat: number; long: number } | null {
    const savedLocation = this.getStoredItem(this.loginLocationKey);

    if (!savedLocation) {
      return null;
    }

    try {
      return JSON.parse(savedLocation);
    } catch {
      this.removeStoredItem(this.loginLocationKey);
      return null;
    }
  }

  clearLoginLocation() {
    this.removeStoredItem(this.loginLocationKey);
  }

  setLastProtectedRoute(url: string) {
    if (!url) {
      return;
    }

    this.setSessionStoredItem(this.lastProtectedRouteKey, url);
  }

  getLastProtectedRoute(): string | null {
    return this.getSessionStoredItem(this.lastProtectedRouteKey);
  }

  clearLastProtectedRoute() {
    this.removeSessionStoredItem(this.lastProtectedRouteKey);
  }

  private getCurrentPosition(options?: PositionOptions) {
    return new Promise<{ lat: number; long: number }>((resolve, reject) => {
      if (
        !this.isBrowser ||
        typeof navigator === 'undefined' ||
        !navigator.geolocation
      ) {
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
    this.loginFlowKeys.forEach((key) => this.removeStoredItem(key));

    if (!preserveLocation) {
      this.clearLoginLocation();
    }
  }

  logout(options?: { preserveLoginLocation?: boolean }) {
    const preserveLoginLocation = options?.preserveLoginLocation ?? true;

    this.removeStoredItem('user');
    this.removeStoredItem('accessToken');
    this.removeStoredItem('refreshToken');
    this.clearLoginFlowData(preserveLoginLocation);
    this.clearLastProtectedRoute();

    if (this.isBrowser && typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }

    this.locationRequestPromise = null;
    this.currentUserSubject.next(null);
  }

  async prefetchLocationIfAvailable() {
    if (this.getSavedLoginLocation() || this.locationRequestPromise) {
      return;
    }

    if (
      !this.isBrowser ||
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
