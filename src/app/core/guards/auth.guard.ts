import { inject } from '@angular/core';
import { Router, UrlTree, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (): boolean | UrlTree => {
  const router = inject(Router);
  const auth = inject(AuthService);

  const user = auth.getCurrentUser();
  const token = auth.getToken();

  if (!token || !user) {
    return router.createUrlTree(['/login']);
  }

  if (!user.stateId) {
    auth.logout();
    return router.createUrlTree(['/login']);
  }

  return true;
};