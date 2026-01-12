import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SharedDataService {
  // --- Profile image tracking ---
  private profileUrlSubject = new BehaviorSubject<string | null>(
    localStorage.getItem('profileUrl')
  );
  profileUrl$ = this.profileUrlSubject.asObservable();

  updateProfileUrl(url: string) {
    localStorage.setItem('profileUrl', url);
    this.profileUrlSubject.next(url);
  }

  // --- Modal tracking ---
  private profileModalSubject = new BehaviorSubject<boolean>(false);
  profileModal$ = this.profileModalSubject.asObservable();
  private modalShownThisSession = false;

  showProfileModal() {
    if (!this.modalShownThisSession) {
      this.profileModalSubject.next(true);
      this.modalShownThisSession = true; // ✅ Prevent repeat in same session
    }
  }

  hideProfileModal() {
    this.profileModalSubject.next(false);
  }

  // ✅ Call this after login to reset for new session
  resetModalFlag() {
    this.modalShownThisSession = false;
  }
}
