import { Component, Input } from '@angular/core';
import { ModalController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { BlockKey } from '../shared/models/simulation.models';

@Component({
  selector: 'app-esperance-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './esperance-modal.component.html'
})
export class EsperanceModalComponent {

  @Input() p!: number;
  @Input() type!: BlockKey;
  @Input() conditional!: boolean;

  tira = 1;
  iduki = 2;

  get eTenir() {
    return (2 * this.p - 1) * this.iduki;
  }

  get eTirer() {
    return -this.tira;
  }

  get decision() {
    return this.eTenir > this.eTirer;
  }

  incTira() {
    this.tira++;
    if (this.iduki <= this.tira) {
      this.iduki = this.tira + 1;
    }
  }

  decTira() {
    if (this.tira > 1) {
      this.tira--;
    }
  }

  incIduki() {
    this.iduki++;
  }

  decIduki() {
    if (this.iduki > this.tira + 1) {
      this.iduki--;
    }
  }
  constructor(public modalCtrl: ModalController) {}
}
