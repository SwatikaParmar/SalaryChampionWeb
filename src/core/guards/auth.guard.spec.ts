import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { AuthServiceService } from '../../service/auth-service.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let routerSpy: jasmine.SpyObj<Router>;
  let authServiceStub: { currentUserValue: any; logout: jasmine.Spy };

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    authServiceStub = {
      currentUserValue: null,
      logout: jasmine.createSpy('logout'),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: Router, useValue: routerSpy },
        { provide: AuthServiceService, useValue: authServiceStub },
      ],
    });

    guard = TestBed.inject(AuthGuard);
  });

  it('should allow navigation for authenticated users', () => {
    authServiceStub.currentUserValue = { id: 'USER1' };

    expect(guard.canActivate({} as any, {} as any)).toBeTrue();
    expect(authServiceStub.logout).not.toHaveBeenCalled();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('should redirect guests to login', () => {
    authServiceStub.currentUserValue = null;

    expect(guard.canActivate({} as any, {} as any)).toBeFalse();
    expect(authServiceStub.logout).toHaveBeenCalledWith({
      preserveLoginLocation: true,
    });
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
  });
});
