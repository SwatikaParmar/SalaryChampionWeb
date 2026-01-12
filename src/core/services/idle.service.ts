import { Injectable, NgZone } from '@angular/core';
import { fromEvent, merge, Subscription, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ApiEndPoint } from '../../enums/api-end-point';

@Injectable({ providedIn: 'root' })
export class IdleService {
  private userActivityEvents = [
    'click',
    'mousemove',
    'keydown',
    'scroll',
    'touchstart',
  ];
  private activitySubscription!: Subscription;
  private idleTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(private ngZone: NgZone, private http: HttpClient) {}

  startWatching() {
    this.ngZone.runOutsideAngular(() => {
      const activityEvents$ = merge(
        ...this.userActivityEvents.map((event) => fromEvent(document, event))
      );

      this.activitySubscription = activityEvents$
        .pipe(
          switchMap(() => timer(this.idleTimeout)) // restart timer on activity
        )
        .subscribe(() => {
          this.ngZone.run(() => this.refreshToken());
        });
    });
  }

  stopWatching() {
    if (this.activitySubscription) {
      this.activitySubscription.unsubscribe();
    }
  }

  private refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken'); // store your refresh token
    if (!refreshToken) return;

    this.http
      .post<any>(environment.apiUrl + ApiEndPoint.refreshToken, {
        refreshToken,
      })
      .subscribe({
        next: (res) => {
          if (res.accessToken) {
            localStorage.setItem('token', res.accessToken);
            localStorage.setItem('refreshToken', res.refreshToken);
          }
        },
        error: (err) => {
          console.error('Refresh token failed', err);
        },
      });
  }
}
