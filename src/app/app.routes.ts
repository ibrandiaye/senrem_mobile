import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'form-ventes',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/form-ventes/form-ventes.page').then((m) => m.FormVentesPage),
  },
  {
    path: 'form-animations',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/form-animations/form-animations.page').then((m) => m.FormAnimationsPage),
  },
  {
    path: 'form-demonstrations',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/form-demonstrations/form-demonstrations.page').then((m) => m.FormDemonstrationsPage),
  },
  {
    path: 'form-caravanes',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/form-caravanes/form-caravanes.page').then((m) => m.FormCaravanesPage),
  },
  {
    path: 'form-emissions',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/form-emissions/form-emissions.page').then((m) => m.FormEmissionsPage),
  },
  {
    path: 'form-leaders',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/form-leaders/form-leaders.page').then((m) => m.FormLeadersPage),
  },
  {
    path: 'form-gpf',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/form-gpf/form-gpf.page').then((m) => m.FormGpfPage),
  },
  {
    path: 'form-lme',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/form-lme/form-lme.page').then((m) => m.FormLmePage),
  },
  {
    path: 'mes-fiches',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/mes-fiches/mes-fiches.page').then((m) => m.MesFichesPage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
