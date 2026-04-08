import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);

  const adminToken = localStorage.getItem('admin_token');
  const adminUserRaw = localStorage.getItem('admin_user');
  const expiresAt = localStorage.getItem('admin_expires_at');

  if (!adminToken || !adminUserRaw || !expiresAt) {
    return router.createUrlTree(['/admin-login']);
  }

  if (Date.now() > new Date(expiresAt).getTime()) {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_expires_at');
    return router.createUrlTree(['/admin-login']);
  }

  try {
    const adminUser = JSON.parse(adminUserRaw);

    if (adminUser.role !== 'admin') {
      return router.createUrlTree(['/admin-login']);
    }

    return true;
  } catch {
    return router.createUrlTree(['/admin-login']);
  }
};