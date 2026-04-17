import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DashboardRefreshService {
  private readonly refreshRequestsSubject = new Subject<void>();

  get refreshRequests$(): Observable<void> {
    return this.refreshRequestsSubject.asObservable();
  }

  requestRefresh(): void {
    this.refreshRequestsSubject.next();
  }
}
