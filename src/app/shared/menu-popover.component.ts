import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { PopoverController } from '@ionic/angular/standalone';

import { IonList, IonItem, IonLabel } from '@ionic/angular/standalone';

@Component({
  standalone: true,
  selector: 'app-menu-popover',
  imports: [IonList, IonItem, IonLabel],
  template: `
    <ion-list>
      <ion-item button (click)="go('/info')">
        <ion-label>Mode d’emploi</ion-label>
      </ion-item>

      <ion-item button (click)="go('/examples')">
        <ion-label>Exemple</ion-label>
      </ion-item>

      <ion-item button (click)="go('/jeu-help')">
        <ion-label>Cas rares</ion-label>
      </ion-item>

      <ion-item button (click)="go('/esperance')">
        <ion-label>Espérance🙏</ion-label>
      </ion-item>

      <ion-item button (click)="go('/probas')">
        <ion-label>Probabilités</ion-label>
      </ion-item>

      <ion-item button (click)="go('/education')">
        <ion-label>Éducation</ion-label>
      </ion-item>
    </ion-list>
  `,
})
export class MenuPopoverComponent {
  private popCtrl = inject(PopoverController);
  private router = inject(Router);

  async go(path: string) {
    await this.popCtrl.dismiss();
    await this.router.navigateByUrl(path);
  }
}