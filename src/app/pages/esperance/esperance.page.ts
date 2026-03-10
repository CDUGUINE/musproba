import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonFooter, IonButton, IonText, IonCardContent, IonCard } from '@ionic/angular/standalone';
import { Router } from '@angular/router';

@Component({
  selector: 'app-esperance',
  templateUrl: './esperance.page.html',
  styleUrls: ['./esperance.page.scss'],
  standalone: true,
  imports: [IonCard, IonCardContent, IonText, IonButton, IonFooter, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class EsperancePage implements OnInit {
    private router = inject(Router);

  ngOnInit() {
  }

  back() {
    this.router.navigateByUrl('/simulation');
  }
}
