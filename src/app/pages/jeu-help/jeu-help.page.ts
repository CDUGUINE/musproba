import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonButton, IonText, IonFooter } from '@ionic/angular/standalone';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-jeu-help',
  imports: [IonFooter, IonText, 
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonButton
  ],
  templateUrl: './jeu-help.page.html',
  styleUrls: ['./jeu-help.page.scss'],
})
export class JeuHelpPage implements OnInit {
  private router = inject(Router);

  ngOnInit(): void {
    
  }

  back() {
    this.router.navigateByUrl('/simulation');
  }
}
