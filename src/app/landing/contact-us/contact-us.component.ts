import { Component } from '@angular/core';

@Component({
  selector: 'app-contact-us',
  templateUrl: './contact-us.component.html',
  styleUrl: './contact-us.component.css'
})
export class ContactUsComponent {
  openFaq: string | null = null;

  toggleFaq(faqId: string): void {
    this.openFaq = this.openFaq === faqId ? null : faqId;
  }
}
