import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthServiceService } from '../../service/auth-service.service';
@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private router: Router,
    private authService: AuthServiceService,
  ) {}
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): boolean {
    const currentUser = this.authService.currentUserValue;

    if (currentUser) {
      return true;
    }

    this.authService.logout({ preserveLoginLocation: true });
    this.router.navigate(['/auth/login']);
    return false;
  }
}
