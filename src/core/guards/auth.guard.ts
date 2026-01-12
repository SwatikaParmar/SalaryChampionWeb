import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router,
    private authService: AuthService
  ) { }

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot) {

    const currentUser = this.authService.currentUserValue;

    if (currentUser) {
      return true;
    }
       localStorage.clear();
      sessionStorage.clear();
    this.router.navigate(['/login']);
    return false;
  }

}
