import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthServiceService } from '../../service/auth-service.service';
@Injectable()
export class JwtInterceptor implements HttpInterceptor {

  private static isLoggingOut = false;

  constructor(
    private router: Router
  ) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {

    const token = localStorage.getItem('accessToken');

    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {

        if (JwtInterceptor.isLoggingOut) {
          return throwError(() => error);
        }

        if (error.status === 401) {
          JwtInterceptor.isLoggingOut = true;

          alert('Session expired. Please login again.');

          localStorage.clear();

          this.router.navigate(['/auth/login']).then(() => {
            window.location.reload();
          });
        }

        return throwError(() => error);
      })
    );
  }
}

