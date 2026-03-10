import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonCard, IonCardContent, IonText, IonFooter, IonButtons } from '@ionic/angular/standalone';
import { Router } from '@angular/router';

@Component({
  selector: 'app-examples',
  templateUrl: './education.page.html',
  styleUrls: ['./education.page.scss'],
  standalone: true,
  imports: [IonFooter, IonText, IonCardContent, IonCard, IonButton, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class EducationPage implements OnInit {
    private router = inject(Router);

  ngOnInit() {
  }

  back() {
    this.router.navigateByUrl('/simulation');
  }
}