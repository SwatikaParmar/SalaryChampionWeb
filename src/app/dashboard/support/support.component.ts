import { Component } from '@angular/core';

@Component({
  selector: 'app-support',
  templateUrl: './support.component.html',
  styleUrl: './support.component.css',
})
export class SupportComponent {
  readonly supportContactCard = {
    title: 'Support',
    subtitle: 'Need help with your loan journey? Reach out to us through the details below.',
    address:
      'B-52 2ND FLOOR, UNDER PASS, near KIRTI NAGAR, Block B, Naraina Industrial Area Phase 2, New Delhi, Delhi, 110028',
    phone: '+91 88009 44435',
    email: 'grievance@salarychampion.com',
  };
}
