import { Injectable } from '@angular/core';
import { AngularFireMessaging } from '@angular/fire/compat/messaging';
import { BehaviorSubject } from 'rxjs';
@Injectable({
  providedIn: 'root',
})
export class MessagingServiceService {
  currentMessage = new BehaviorSubject<any>(null);

  constructor(private angularfireMessaging: AngularFireMessaging) {}

  requestPermission() {
    this.angularfireMessaging.requestToken.subscribe(
      (token: any) => {
        if (token) {
          localStorage.setItem('FCMtoken', token);
        } else {
          console.warn('No FCM token received');
        }
      },
      (err) => {
        console.error('Unable to get FCM token', err);
      }
    );
  }

  receiveMessaging() {
    this.angularfireMessaging.messages.subscribe((payload) => {
      this.currentMessage.next(payload);
    });
  }
}
