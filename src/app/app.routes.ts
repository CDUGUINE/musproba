import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'simulation',
    pathMatch: 'full',
  },
  {
    path: 'info',
    loadComponent: () => import('./pages/info/info.page').then( m => m.InfoPage)
  },
  {
    path: 'probas',
    loadComponent: () => import('./pages/probas/probas.page').then( m => m.ProbasPage)
  },
  {
    path: 'examples',
    loadComponent: () => import('./pages/examples/examples.page').then( m => m.ExamplesPage)
  },
  {
    path: 'simulation',
    loadComponent: () => import('./pages/simulation/simulation.page').then( m => m.SimulationPage)
  },
  {
    path: 'education',
    loadComponent: () => import('./pages/education/education.page').then( m => m.EducationPage)
  },
  {
    path: 'jeu-help',
    loadComponent: () => import('./pages/jeu-help/jeu-help.page').then( m => m.JeuHelpPage)
  },
  {
    path: 'esperance',
    loadComponent: () => import('./pages/esperance/esperance.page').then( m => m.EsperancePage)
  },
];
