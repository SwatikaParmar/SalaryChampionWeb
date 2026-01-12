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
import { AuthService } from '../services/auth.service';
@Injectable()
export class JwtInterceptor implements HttpInterceptor {

    private static isLoggingOut = false; // 🔥 IMPORTANT FLAG

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }
intercept(
  request: HttpRequest<any>,
  next: HttpHandler
): Observable<HttpEvent<any>> {

  const token = localStorage.getItem('token');

  if (token) {
    request = request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next.handle(request).pipe(
    catchError((error: HttpErrorResponse) => {

      // 🔕 Already logging out → ignore
      if (JwtInterceptor.isLoggingOut) {
        return throwError(() => error);
      }

      if (error.status === 401) {
        JwtInterceptor.isLoggingOut = true;

        alert('Session expired. Please login again.');

        localStorage.clear();

            localStorage.clear();
 this.router.navigate(['/login']).then(() => {
      window.location.reload();
    });  

      }

      return throwError(() => error);
    })
  );
}

}
