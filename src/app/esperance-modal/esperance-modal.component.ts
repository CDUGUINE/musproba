import { Component, Input } from '@angular/core';
import { ModalController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { BlockKey, JeuEvStats, JeuStats, JeuTieContext, TieStrategy } from '../shared/models/simulation.models';

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

  @Input() stats!: JeuStats;
  @Input() jeuEvStats!: JeuEvStats;
  @Input() pWin!: number;
  @Input() pMe!: number;
  @Input() pPartner!: number;
  @Input() pTie!: number;
  @Input() pLose!: number;

  @Input() myPoints!: number;
  @Input() tieContext!: JeuTieContext;
  @Input() selectedTieStrategy!: TieStrategy;
  @Input() isFauxJeu!: boolean;

  tira = 1;
  iduki = 2;
  protected readonly TieStrategy = TieStrategy;

  onTieStrategyChange(event: CustomEvent) {
    this.selectedTieStrategy = event.detail.value as TieStrategy;
  }

  get avgTeamPointsWin(): number {
  return this.stats?.avg_team_points_win ?? 0;
}

get avgOppLose(): number {
  return this.stats?.avg_opp_points_lose ?? 0;
}

get avgOppAll(): number {
  return this.stats?.avg_opp_points_all ?? 0;
}

  get tieAlpha(): number {
    switch(this.selectedTieStrategy) {
      case TieStrategy.ESKU:
        return 1;
      case TieStrategy.SAKU:
        return 0;
      default:
        return 0.5;
    }
  }

  get modalTitle() {
    return this.isFauxJeu
      ? 'Espérance faux-jeu'
      : `Espérance ${this.type}`;
  }

  get showPointsEV(): boolean {
    return !this.isFauxJeu;
  }

  get effectivePWin(): number {
    if (!this.stats) {
      return 0;
    }

    // ===== GRAND-PETIT =====

    if (this.type === 'grand' || this.type === 'petit') {
      return this.pWin;
    }

    // ===== FAUX-JEU =====

    if (this.isFauxJeu) {

      return (
        this.pMe +
        this.pPartner +
        this.tieAlpha * this.pTie
      );
    }

    // ===== JEU NORMAL =====

    if (
      this.stats.matched_trials <= 0
    ) {
      return 0;
    }

    return (
      this.stats.me +
      this.stats.partner +
      this.tieAlpha * this.stats.tie
    ) / this.stats.matched_trials;
  }

  get isExtendedMode() {
    return this.type === 'paires' || this.type === 'jeu';
  }

  get decision() {
    return this.evPariTenir > this.evPariTirer;
  }

  get evPariTenir() {
    if (this.isFauxJeu) {
      return ((2 * this.effectivePWin - 1) * (this.iduki + 1));
    }
    return ((2 * this.effectivePWin - 1) * this.iduki);
  }

  get evPariTirer() {
    if (this.isFauxJeu) {
      return -(this.tira + 1);
    }
    return -this.tira;
  }
  
  get evPointsTenir() {
    return (
      this.effectivePWin * this.avgTeamPointsWin -
      this.pLose * this.avgOppLose
    );
  }

  get evPointsTirer() {
    return -this.avgOppAll;
  }

  get eTenirTotal() {
    return this.evPariTenir + this.evPointsTenir;
  }

  get eTirerTotal() {
    return this.evPariTirer + this.evPointsTirer;
  }

  get decisionTotal() {
    return this.eTenirTotal > this.eTirerTotal;
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
