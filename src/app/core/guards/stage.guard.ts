import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  UrlTree
} from '@angular/router';
import { AuthService } from '../services/auth.service';

export const stageGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot
): boolean | UrlTree => {
  const router = inject(Router);
  const auth = inject(AuthService);

  const user = auth.getCurrentUser();
  const token = auth.getToken();

  if (!token || !user) {
    return router.createUrlTree(['/login']);
  }

  const requiredStage = Number(route.data?.['stage'] ?? 0);
  const currentStage = Number(user.stage ?? auth.getStage() ?? 0);

  if (currentStage === requiredStage) {
    return true;
  }

  if (currentStage === 0) {
    return router.createUrlTree(['/locked']);
  }

  if (currentStage === 1) {
    return router.createUrlTree(['/path-finder']);
  }

  if (currentStage === 2) {
    return router.createUrlTree(['/completed']);
  }

  return router.createUrlTree(['/login']);
};