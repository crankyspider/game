import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { LockedComponent } from './features/locked/locked.component';
import { AdminPanelComponent } from './features/admin-panel/admin-panel.component';
import { PathFinderComponent } from './features/path-finder/path-finder.component';
import { authGuard } from './core/guards/auth.guard';
import { stageGuard } from './core/guards/stage.guard';
import { AdminLoginComponent } from './features/admin-login/admin-login.component';
import { CompletedComponent } from './features/completed/completed.component';
import { adminGuard } from './core/guards/admin.guard';
import { FingerprintComponent } from './features/fingerprint/fingerprint.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'login', component: LoginComponent },
  { path: 'locked', component: LockedComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },

  { path: 'admin-login', component: AdminLoginComponent },
  { path: 'admin', component: AdminPanelComponent, canActivate: [adminGuard] },
  { path: 'completed', component: CompletedComponent, canActivate: [authGuard] },

  {
    path: 'path-finder',
    component: PathFinderComponent,
    canActivate: [authGuard, stageGuard],
    data: { stage: 1 }
  },

  {
  path: 'dashboard',
  component: FingerprintComponent,
  canActivate: [authGuard, stageGuard],
  data: { stage: 2 }
},

  

  { path: '**', redirectTo: 'login' }
];