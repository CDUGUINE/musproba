import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonCard, IonCardContent, IonText, IonFooter } from '@ionic/angular/standalone';
import { Router } from '@angular/router';

@Component({
  selector: 'app-examples',
  templateUrl: './examples.page.html',
  styleUrls: ['./examples.page.scss'],
  standalone: true,
  imports: [IonFooter, IonText, IonCardContent, IonCard, IonButton, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class ExamplesPage implements OnInit {
  private router = inject(Router);

  ngOnInit() {
  }

  back() {
    this.router.navigateByUrl('/simulation');
  }
}
