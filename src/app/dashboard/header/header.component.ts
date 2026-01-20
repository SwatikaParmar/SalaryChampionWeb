import { Component } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {

  user: any = null;

  ngOnInit(): void {
    const storedUser = localStorage.getItem('user'); // ya API response se
    this.user = storedUser ? JSON.parse(storedUser) : null;
  }

  get userName(): string {
    return this.user?.name?.trim() || 'User';
  }

  get profileImage(): string {
    return this.user?.profilePicUrl?.trim()
      ? this.user.profilePicUrl
      : 'assets/images/c1_1.webp';
  }

  onImageError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/images/c1_1.webp';
  }
}
