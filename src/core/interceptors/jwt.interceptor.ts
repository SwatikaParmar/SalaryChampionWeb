import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthServiceService } from '../../service/auth-service.service';
@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  private static isLoggingOut = false;

  constructor(
    private router: Router,
    private authService: AuthServiceService,
  ) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    const token =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('accessToken')
        : null;

    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (JwtInterceptor.isLoggingOut) {
          return throwError(() => error);
        }

        if (error.status === 401) {
          JwtInterceptor.isLoggingOut = true;

          if (typeof window !== 'undefined' && typeof alert !== 'undefined') {
            alert('Session expired. Please login again.');
          }

          this.authService.logout({ preserveLoginLocation: true });

          this.router.navigate(['/auth/login']).finally(() => {
            JwtInterceptor.isLoggingOut = false;
          });
        }

        return throwError(() => error);
      }),
    );
  }
}
