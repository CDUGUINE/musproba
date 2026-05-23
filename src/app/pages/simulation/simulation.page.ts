import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalController, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonText, IonGrid, IonRow, IonCol, IonHeader, IonTitle, IonButton, IonToggle, IonAccordionGroup, IonItem, IonAccordion, IonLabel, IonButtons, IonPopover, IonCheckbox, IonToolbar, IonSegment, IonSegmentButton } from '@ionic/angular/standalone';
import { ApiService } from '../../core/http/api.service';
import { Simul1Response, BlockKey, OutcomeStats, MusResponse, SimCondBetDoubleRequest, TieStrategy, TieFormType } from '../../shared/models/simulation.models';
import { Router } from '@angular/router';
import type { AdvKey, BetConfig, CondAdv, JeuTieContext, JeuTieContextBase, SimCondBetDoubleFilteredRequest, SimFauxJeuFilteredResponse, TieDecision, TieFormConfig, TieResolutionAnswers } from '../../shared/models/simulation.models';
import { PopoverController } from '@ionic/angular';
import { MenuPopoverComponent } from '../../shared/menu-popover.component';
import { inject } from '@angular/core';
import { EsperanceModalComponent } from '../../esperance-modal/esperance-modal.component';


@Component({
  standalone: true,
  selector: 'app-simulation',
  imports: [IonSegmentButton, IonSegment, 
  CommonModule,
  ReactiveFormsModule,

  IonContent,
  IonHeader,
  IonTitle,
  IonText,

  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,

  IonGrid,
  IonRow,
  IonCol,

  IonButton,
  IonToggle,
  IonCheckbox,
  IonToolbar,

  IonAccordionGroup,
  IonAccordion,
  IonItem,
  IonLabel,

  IonButtons,
  IonPopover,

  MenuPopoverComponent
],
  templateUrl: './simulation.page.html',
  styleUrls: ['./simulation.page.scss'],
  providers: [PopoverController],
})

export class SimulationPage {
  private requestIds = {
    paires: 0,
    jeu: 0
  };

openEsperance(type: BlockKey) {
  const p = this.getProbability(type);
  const isFauxJeu = type === 'jeu' && !this.teamHasJeu(this.result);

  let stats: any = null;
  let pWin = 0;
  let pMe = 0;
  let pPartner = 0;
  let pTie = 0;
  let pLose = 0;
  let avgTeamPointsWin = 0;
  let avgOppLose = 0;
  let avgOppAll = 0;

  if (type === 'jeu') {
    if (isFauxJeu) {
      stats = this.lastFauxJeuResult;
    } else {
      const adv = this.betConfig.advHasJeu;
      stats = this.evJeuAcc[adv === 1 ? 'adv1' : 'adv2'];
    }

  } else if (type === 'paires') {
    stats = this.lastPairesResult;

  } else {
    stats = this.getStats(type);
  }

  if (stats) {
    // ===== FAUX-JEU =====
    if (isFauxJeu) {
      pMe = (stats.me_pct ?? 0) / 100;
      pPartner = (stats.partner_pct ?? 0) / 100;
      pTie = (stats.tie_pct ?? 0) / 100;
      pLose = (stats.lose_pct ?? 0) / 100;

      pWin =
        (
          (stats.me_pct ?? 0) +
          (stats.partner_pct ?? 0) +
          0.5 * (stats.tie_pct ?? 0)
        ) / 100;

    // ===== JEU ACCUMULATION =====

    } else
    if (type === 'jeu' && !isFauxJeu) {
      // 🔴 cas accumulation (jeu)
      pMe = stats.matched_trials > 0
          ? stats.me / stats.matched_trials
          : 0;
      pPartner = stats.matched_trials > 0
          ? stats.partner / stats.matched_trials
          : 0;
      pLose = stats.matched_trials > 0
          ? stats.lose / stats.matched_trials
          :0;
      pTie = stats.matched_trials >0
          ? stats.tie / stats.matched_trials
          :0;

      pWin = stats.matched_trials > 0
          ? (stats.me + stats.partner + 0.5 * stats.tie) / stats.matched_trials
          : 0;

      avgTeamPointsWin = stats.team_win_count > 0
        ? stats.team_points_sum /stats.team_win_count
        : 0;

      avgOppLose = stats.opp_lose_count > 0
          ? stats.opp_points_lose_sum / stats.opp_lose_count
          : 0;

      avgOppAll = stats.opp_all_count > 0
          ? stats.opp_points_all_sum / stats.opp_all_count
          : 0;

      stats.avg_team_points_win = avgTeamPointsWin;
      stats.avg_opp_points_lose = avgOppLose;
      stats.avg_opp_points_all = avgOppAll;

    } else {
      // 🔴 cas API directe (paires / grand)
      pMe = (stats.me_pct ?? 0) / 100;
      pPartner = (stats.partner_pct ?? 0) / 100;
      pLose = (stats.lose_pct ?? 0) / 100;
      pTie = (stats.tie_pct ?? 0) / 100;

      pWin =
        ((stats.me_pct ?? 0) +
         (stats.partner_pct ?? 0) +
         0.5 * (stats.tie_pct ?? 0)) / 100;

      if (type === 'paires') {
        avgTeamPointsWin = stats.avg_team_points_win ?? 0;
        avgOppLose = stats.avg_opp_points_lose ?? 0;
        avgOppAll = stats.avg_opp_points_all ?? 0;
      }
    }
  }

  let myPoints = 0;

  if (type === 'paires') {
    myPoints = this.getMyPairsPoints();
  }

  if (type === 'jeu') {
    myPoints = this.getMyJeuPoints();
  }

  if (type === 'jeu') {
    this.tieContext = isFauxJeu
        ? this.buildFauxJeuTieContext()
        : this.buildTieContext('jeu');
  } else if (type === 'paires') {
    this.tieContext = this.buildTieContext('paires');
  } else {
    this.tieContext = null;
  }

  this.modalCtrl.create({
    component: EsperanceModalComponent,
    componentProps: {
      pWin,
      pMe,
      pPartner,
      pLose,
      pTie,
      myPoints,
      stats: stats,
      type: type,
      conditional: this.conditionalMode[type],
      tieContext: this.tieContext,
      selectedTieStrategy: this.selectedTieStrategy,
      isFauxJeu
    }
  }).then(modal => modal.present());
}

showLongPressHint = true;

goJeuHelp() {
  this.router.navigateByUrl('/jeu-help');
}

n1Simul = 20000;
n2Simul = 200000;

openAdvJeu() {
  const base = this.buildPayload(1);
  if (!base) return;

  const hasJeu = this.teamHasJeu(this.result);

  if (!hasJeu) {
    const body = { iterations: 80000, hand_j1: base.hand_j1, hand_j3: base.hand_j3 };
    this.fauxJeuEstimateText = 'Calculs en cours…';

    this.api.simulateFauxJeu(body).subscribe({
      next: (r: any) => {
        this.fauxJeuEstimateText = (r?.display ?? '').toString();
        this.condState.jeu.loading = false; // 🔴 manquant
      },
      error: (err: any) => {
        console.error(err);
        this.fauxJeuEstimateText = 'Erreur API';
        this.condState.jeu.loading = false; // 🔴 manquant
      }
    });
    return;
  }

  const body = {
    hand_j1: base.hand_j1,
    hand_j3: base.hand_j3,
    bet: 'jeu' as const,
    iterations_adv1: this.condJeuAdvDone.adv1 ? 1 : (this.n1Simul ?? 60000),
    iterations_adv2: this.condJeuAdvDone.adv2 ? 1 : (this.n2Simul ?? 200000),
  };

  this.jeuEstimateText = 'Calculs en cours…';

  this.api.simulateCondBetDouble(body).subscribe({
    next: (r: any) => {
      // accumulation affichage
      this.addToCondJeuAcc('adv1', r?.results?.adv1);
      this.addToCondJeuAcc('adv2', r?.results?.adv2);

      // affichage
      this.jeuEstimateText = this.rebuildJeuDisplayDouble();
      this.condState.jeu.loading = false;
    },
    error: (err: any) => {
      console.error(err);
      this.jeuEstimateText = 'Erreur API';
      this.condState.jeu.loading = false;
    }
  });
}

openAdvPaires() {
  const base = this.buildPayload(1);
  if (!base) return;

  const body = {
    hand_j1: base.hand_j1,
    hand_j3: base.hand_j3,
    bet: 'paires' as const,
    iterations_adv1: 30000,
    iterations_adv2: 80000,
  };

  this.pairesEstimateText = 'Calculs en cours…';

  this.api.simulateCondBetDouble(body).subscribe({
    next: (r: any) => {
      this.pairesEstimateText = r?.display_double ?? '';
    },
    error: (err: any) => {
      console.error(err);
      this.pairesEstimateText = 'Erreur API';
    }
  });
}

musOverlayOpen = false;
musNewHandValues: number[] = [];   // 4 valeurs (1..10)
musNewHandCards: number[] = [];    // 4 ids 1..40 (pour images)
overlayNewHandCards: number[] = [];
overlayNewHandVisible: boolean = false;
simHasMultiRun: boolean = false;
estimerDisplayDouble = '';
estimerDisplayJeu = '';
estimerLastRequest: unknown = null;
estimerLastResponse: unknown = null;

// MODE DÉBUT
pairesEstimateText = '';  // ce que renvoie simulate_cond_bet_double pour bet=paires
jeuEstimateText = '';     // texte cumulé du jeu (display reconstruit)
fauxJeuEstimateText = ''; // display de simulate_faux_jeu (si tu l’affiches plus tard)

// MODE PARI
betPairesEstimateText = '';
betJeuEstimateText = '';
betFauxJeuEstimateText = '';

autoRunning = false;
autoDone = false;
hasCheckedRareCase = false;
autoStep = 0;
autoTotal = 10;
myPoints = 1 | 2 | 3;

rareCaseMessage: string | null = null;
showAutoRunButton = false;

errorText: string | null = null;
lastPairesResult: any = null;
lastFauxJeuResult: SimFauxJeuFilteredResponse | null = null;
selectedTieStrategy: TieStrategy = TieStrategy.MILIEU;

isFauxJeu =false;

private condJeuAcc: Record<AdvKey, CondAdv> = {
  adv1: { adv: 1, iterations: 0, matched_trials: 0, me: 0, partner: 0, tie: 0, lose: 0, 
    team_points_sum: 0, team_win_count: 0, opp_lose_count: 0, opp_all_count: 0, opp_points_lose_sum: 0, opp_points_all_sum: 0 },
  adv2: { adv: 2, iterations: 0, matched_trials: 0, me: 0, partner: 0, tie: 0, lose: 0, 
    team_points_sum: 0, team_win_count: 0, opp_lose_count: 0, opp_all_count: 0, opp_points_lose_sum: 0, opp_points_all_sum: 0 },
};

private evJeuAcc: Record<AdvKey, CondAdv> = {
  adv1: { adv: 1, iterations: 0, matched_trials: 0, me: 0, partner: 0, tie: 0, lose: 0, 
    team_points_sum: 0, team_win_count: 0, opp_lose_count: 0, opp_all_count: 0, opp_points_lose_sum: 0, opp_points_all_sum: 0 },
  adv2: { adv: 2, iterations: 0, matched_trials: 0, me: 0, partner: 0, tie: 0, lose: 0, 
    team_points_sum: 0, team_win_count: 0, opp_lose_count: 0, opp_all_count: 0, opp_points_lose_sum: 0, opp_points_all_sum: 0 },
};

choosePartnerHand() {
  this.partnerFixed = true;
  this.inputTarget = 'j3';
  this.inputMode = 'keypad';
}

  loading = false;
  errorMsg: string | null = null;
  result: Simul1Response | null = null;
  musResult: MusResponse | null = null;

  actionMode: 'home' | 'mintza' | 'mus' = 'home';

  inputMode: 'none' |'compact' | 'keypad' = 'compact';

  inputTarget: 'j1' | 'j3' = 'j1';          // <- qui est en train de saisir au clavier
  partnerFixed = false;                     // <- j3 fixé ou simulé

  mode: 'start' | 'bet' = 'start';

  startResult: Simul1Response | null = null;

  condState = {
    paires: { loading: false, done: false },
    jeu: { loading: false, count: 0, target: 10000 }
  };

  evState = {
    paires: { loading: false, done: false },
    jeu: { loading: false, count: 0, target: 4000 }
  };

  betConfig: BetConfig = {
  partnerHasPairs: false,
  partnerHasJeu: false,

  advHasPairs: null,
  advHasJeu: null,

  partnerLeqMe: false
};

  betStats = {
    adv1: null,
    adv2: null,
  };

  betAccum = {
    adv1: { winPoints: 0, winCount: 0, losePoints: 0, loseCount: 0, matched: 0 },
    adv2: { winPoints: 0, winCount: 0, losePoints: 0, loseCount: 0, matched: 0 },
  };

  isBetType(type: BlockKey): type is 'paires' | 'jeu' {
    return type === 'paires' || type === 'jeu';
  }

  isReadyForEV(type: BlockKey): boolean {
    if (type === 'grand' || type === 'petit') return true;
    // if (this.partnerFixed) return true;

    if (type === 'paires') {
      return this.evState.paires.done;
    }

    if (type === 'jeu') {
      return this.evState.jeu.count >= this.evState.jeu.target;
    }

    return false;
  }

  isButtonDisabled(type: BlockKey): boolean {
    if (type === 'grand' || type === 'petit') return false;

    const s = this.condState[type];

    return s.loading || this.autoRunning;
  }

  getButtonIcon(type: BlockKey): string {
    if (type === 'grand' || type === 'petit') return '🙏';

    if (type === 'paires') {
      const s = this.evState.paires;
      if (s.loading) return '⏳';
      return s.done ? '🙏' : '🎲';
    }

    if (type === 'jeu') {
      const s = this.evState.jeu;

      if (s.loading) return '⏳';
      if (this.autoRunning) return '⏳';
      if (this.isReadyForEV(type)) return '🙏';
      // if (this.autoDone) return '🙏';

      const adv = this.betConfig.advHasJeu;

      const teamHasJeu =
        this.hasMyJeu() ||
        (this.partnerFixed
          ? this.hasPartnerJeuReal()
          : this.betConfig.partnerHasJeu === true);

      // if (this.isReadyForEV('jeu')) { return '🙏';}
      return '🎲';
    }

    return '🎲';
  }

  onMainButtonClick(type: BlockKey) {
    if (type === 'grand' || type === 'petit') {
      this.openEsperance(type);
      return;
    }

    if (type === 'paires') {
      if (this.evState.paires.done) {
        this.openEsperance(type);
      } else {
        this.runBetPaires();
      }
      return;
    }

    if (type === 'jeu') {
      if (this.evState.jeu.count >= this.evState.jeu.target || this.autoDone) {
        this.openEsperance(type);
      } else {
        this.runBetJeu();
      }
      return;
    }
  }

  runEvSimulation(type: BlockKey): Promise<void> {
  const requestId = ++this.requestIds.jeu;  
  const base = this.buildPayload(1);
  if (!base) return Promise.resolve();

  const isCond = this.conditionalMode[type];
  const iterAdv1 = this.betConfig.partnerHasJeu ? 500000 : 50000;

  const body: SimCondBetDoubleFilteredRequest = {
    hand_j1: base.hand_j1,
    hand_j3: base.hand_j3,

    bet: type as any,

    partner_has_jeu: this.partnerFixed
      ? undefined
      : this.betConfig.partnerHasJeu,

    no_better: isCond,

    iterations_adv1: this.evJeuAdvDone.adv1 ? 1 : iterAdv1,
    iterations_adv2: this.evJeuAdvDone.adv2 ? 1 : 1000000,
  };

  this.evState.jeu.loading = true;

  return new Promise((resolve, reject) => {
    this.api.simulateCondBetDoubleFiltered(body).subscribe({
      next: (r: any) => {
        if (requestId !== this.requestIds.jeu) {
          return;
        }
        
        this.evState.jeu.loading = false;
        const adv = this.betConfig.advHasJeu;

        if (adv === 1) {
          this.addToEvJeuAcc('adv1', r?.results?.adv1);
          this.evState.jeu.count += r?.results?.adv1?.matched_trials ?? 0;
        }

        if (adv === 2) {
          this.addToEvJeuAcc('adv2', r?.results?.adv2);
          this.evState.jeu.count += r?.results?.adv2?.matched_trials ?? 0;
        }

        this.betJeuEstimateText = this.rebuildEvJeuDisplaySingle();

        // 🔴 TEST ICI (après accumulation)
        const res = adv === 1 ? r?.results?.adv1 : r?.results?.adv2;

        const cf = this.evState.jeu.count;
        const winPct = (res?.me_pct ?? 0) + (res?.partner_pct ?? 0);

        // 🔴 1. CALCUL ERREUR (toujours)
        if (cf > 0) {
          const p = winPct / 100;
          const n = cf;

          const probError = 1.96 * Math.sqrt((p * (1 - p)) / n);

          const amplitude = 4;
          const evError = probError * amplitude;

          this.errorText =
            `Incertitude : ±${(probError * 100).toFixed(1)}%` +
            ` (🙏 ±${evError.toFixed(2)})`;
        } else {
          this.errorText = null;
        }

        if (!this.autoRunning && !this.hasCheckedRareCase && !this.autoDone) {
          this.hasCheckedRareCase = true;

          if (cf < 1000) {

            if (winPct < 20) {
              this.rareCaseMessage =
                "⚠️ Probabilité de victoire trop faible. L'espérance est peu pertinente.";
              this.showAutoRunButton = false;

            } else {
              this.rareCaseMessage =
                "Cas rare : peu de cas favorables.\nVoulez-vous lancer des simulations supplémentaires ?";
              this.showAutoRunButton = true;
            }
          }
        }
        resolve();
      },
      error: (err) => {
        reject(err);
      }
    });

  });
}

startAutoRun(type: BlockKey) {
  this.showAutoRunButton = false;
  this.rareCaseMessage = null;
  this.autoRun(type);
}

cancelRareCase() {
  this.rareCaseMessage = null;
}

  enterBetMode() {
    this.mode = 'bet';

    if (this.betConfig.partnerHasPairs === null) {
      this.betConfig.partnerHasPairs = false;
    }

    if (this.betConfig.partnerHasJeu === null) {
      this.betConfig.partnerHasJeu = false;
    }

    // 🔴 important : on repart propre
    this.evState.paires.done = false;
    this.evState.jeu.count = 0;
  }

  hasPartnerReal(type: BlockKey): boolean {
    return type === 'paires'
      ? this.hasPartnerPairsReal()
      : this.hasPartnerJeuReal();
  }

  hasMy(type: BlockKey): boolean {
    return type === 'paires'
      ? this.hasMyPairs()
      : this.hasMyJeu();
  }

  public hasPartnerPairsReal(): boolean {
  if (!this.partnerFixed || !this.j3Cards) return false;

  // convertir id carte (1..40) → rang (1..10)
  const ranks = this.j3Cards.map(c => ((c - 1) % 10) + 1);

  const counts: Record<number, number> = {};

  for (const r of ranks) {
    counts[r] = (counts[r] || 0) + 1;
    if (counts[r] >= 2) return true;
  }

  return false;
  }

  // ✔ version UI (cartes connues)
  public hasPartnerJeuReal(): boolean {
  if (!this.partnerFixed) return false;

  const values = this.handJ3Values; // ⬅️ IMPORTANT
  if (!values || values.length === 0) return false;

  const score = values.reduce((sum, v) => sum + v, 0);
  return score > 30;
  }

  canShowAdvSegment(type: BlockKey): boolean {
    if (type === 'paires') {
      return this.hasMyPairs() || this.hasPartnerPairsReal();
    }

    if (type === 'jeu') {

      const teamHasJeu =
        this.hasMyJeu() ||
        (this.partnerFixed
          ? this.hasPartnerJeuReal()
          : this.betConfig.partnerHasJeu === true);

      return teamHasJeu; // 🔴 correction clé
    }

    return false;
  }

  canComputeEV(type: BlockKey): boolean {

  // GRAND / PETIT
  if (type === 'grand' || type === 'petit') {
    return true;
  }

  // PAIRES
  if (type === 'paires') {
    const adv = this.betConfig.advHasPairs;

    if (adv === null || adv === 0) return false;

    // 🔴 NOUVELLE RÈGLE
    const info = this.getMyPairsInfo();

    const threshold = adv === 1 ? 4 : 6;

    if (
      this.conditionalMode['paires'] &&
      this.betConfig.partnerHasPairs === true &&
      !info.hasMedes &&
      !info.isDoublePair &&
      info.bestPair < threshold
    ) {
      return false;
    }

    // 🔴 IMPORTANT : ne pas bloquer si partenaire inconnu
    if (this.partnerFixed) {
      if (!this.hasMyPairs() && !this.hasPartnerPairsReal()) return false;
    } else {
      if (!this.hasMyPairs() && this.betConfig.partnerHasPairs !== true) return false;
    }

    return true;
  }

  // JEU
  if (type === 'jeu') {
    const adv = this.betConfig.advHasJeu;

    if (adv === null) return false;

    let teamHasJeu: boolean;

    if (this.partnerFixed) {
      teamHasJeu = this.hasMyJeu() || this.hasPartnerJeuReal();
    } else {
      teamHasJeu = this.hasMyJeu() || this.betConfig.partnerHasJeu === true;
    }

    // faux jeu autorisé
    if (!teamHasJeu && adv === 0) return true;

    // incohérences
    if (!teamHasJeu && adv > 0) return false;
    if (teamHasJeu && adv === 0) return false;

    return true;
  }

  return false;
}

  getJeuMessage(): string | null {

    const adv = this.betConfig.advHasJeu;
    if (adv === null) return null;

    const teamHasJeu =
      this.hasMyJeu() ||
      (this.partnerFixed
        ? this.hasPartnerJeuReal()
        : this.betConfig.partnerHasJeu === true);

    const advHasJeu = adv > 0;

    // ❌ aucun adversaire
    if (adv === 0) {
      if (teamHasJeu) {
        return "Aucun adversaire n’a le jeu → pas de pari";
      } else {
        return "Faux jeu";
      }
    }

    // ❌ mismatch
    if (teamHasJeu && !advHasJeu) {
      return "Aucun adversaire n’a le jeu → pas de pari";
    }

    if (!teamHasJeu && advHasJeu) {
      return "Vos adversaires ont le jeu → pas de pari";
    }

    // ⚠️ partenaire inconnu
    if (
      !this.partnerFixed &&
      !this.hasMyJeu() &&
      this.betConfig.partnerHasJeu === true
    ) {
      return "Calcul impossible : aucune donnée sur le jeu du partenaire";
    }

    // ✔ faux-jeu vs faux-jeu → PAS de message bloquant
    if (!teamHasJeu && !advHasJeu) {
      return null;
    }

    return null;
  }

  setAdvPairs(value: any) {
    const v = Number(value);

    if (v === 0 || v === 1 || v === 2) {

      this.betConfig.advHasPairs = v as 0 | 1 | 2;

      if (v === 0) {
        this.betConfig.partnerHasPairs = false;
        this.conditionalMode['paires'] = false;
      }

      if(this.evState.paires.loading) {
        this.requestIds.paires++;
      }
      this.resetPaires();
    }
  }

  setAdvJeu(value: any) {
    const v = Number(value);

    if (v === 0 || v === 1 || v === 2) {

      this.betConfig.advHasJeu = v as 0 | 1 | 2;

      if (v === 0) {
        this.betConfig.partnerHasJeu = false;
        this.conditionalMode['jeu'] = false;
      }

      if(this.evState.jeu.loading) {
        this.requestIds.jeu++;
      }
      this.resetJeu();
    }
  }

  resetBetData() {
    this.betStats = { adv1: null, adv2: null };

    this.betAccum = {
      adv1: { winPoints: 0, winCount: 0, losePoints: 0, loseCount: 0, matched: 0 },
      adv2: { winPoints: 0, winCount: 0, losePoints: 0, loseCount: 0, matched: 0 },
    };
  }

  resetBetState() {
    // --- PAIRES ---
    this.evState.paires = {
      done: false,
      loading: false
    };
    this.betPairesEstimateText = '';
    this.betConfig.partnerHasPairs = false;
    this.conditionalMode['paires'] = false;

    // --- JEU ---
    this.evState.jeu = {
      count: 0,
      target: 4000,
      loading: false
    };
    this.betJeuEstimateText = '';
    this.betFauxJeuEstimateText = '';
    this.betConfig.partnerHasJeu = false;
    this.conditionalMode['jeu'] = false;

    // cumul jeu
    this.resetEvJeuAcc();

    this.evJeuAdvDone = {
      adv1: false,
      adv2: false
    };
  }

  resetPaires() {
    this.evState.paires.done = false;
    this.evState.paires.loading = false;
    this.betPairesEstimateText = '';
  }

  resetJeu() {
    this.evState.jeu.count = 0;
    this.evState.jeu.loading = false;

    this.betJeuEstimateText = '';
    this.betFauxJeuEstimateText = '';

    this.autoDone = false;
    this.autoRunning = false;
    this.autoStep = 0;

    this.resetEvJeuAcc(); // 🔴 TRÈS IMPORTANT
  }

  resetCondJeuAcc() {
    this.condJeuAcc = {
      adv1: { adv: 1, iterations: 0, matched_trials: 0, me: 0, partner: 0, tie: 0, lose: 0,
        team_points_sum: 0, team_win_count: 0, opp_lose_count: 0, opp_all_count: 0, opp_points_lose_sum: 0, opp_points_all_sum: 0 },
      adv2: { adv: 2, iterations: 0, matched_trials: 0, me: 0, partner: 0, tie: 0, lose: 0,
        team_points_sum: 0, team_win_count: 0, opp_lose_count: 0, opp_all_count: 0, opp_points_lose_sum: 0, opp_points_all_sum: 0 },
    };
    this.condJeuAdvDone = {adv1: false, adv2: false};
  }

  resetEvJeuAcc() {
    this.evJeuAcc = {
      adv1: { adv: 1, iterations: 0, matched_trials: 0, me: 0, partner: 0, tie: 0, lose: 0,
        team_points_sum: 0, team_win_count: 0, opp_lose_count: 0, opp_all_count: 0, opp_points_lose_sum: 0, opp_points_all_sum: 0 },
      adv2: { adv: 2, iterations: 0, matched_trials: 0, me: 0, partner: 0, tie: 0, lose: 0,
        team_points_sum: 0, team_win_count: 0, opp_lose_count: 0, opp_all_count: 0, opp_points_lose_sum: 0, opp_points_all_sum: 0 },
    };
    this.evJeuAdvDone = {adv1: false, adv2: false};
  }
  
  onModeChange(event: any) {
    const value = event?.detail?.value;

    if (value === 'start' || value === 'bet') {
      this.mode = value;

      // IMPORTANT pour ton switch
          if (value === 'bet') {
        this.betConfig = {
          ...this.betConfig,
          advHasPairs: this.betConfig.advHasPairs ?? 0,
          advHasJeu: this.betConfig.advHasJeu ?? 0,
        };
      }
    }
  }

  onPartnerToggle(value: boolean, type: BlockKey) {
    if (type === 'paires') {
    this.betConfig.partnerHasPairs = value;

    if (!value) {
      this.conditionalMode['paires'] = false;
    }

    if(this.evState.paires.loading) {
      this.requestIds.paires++;
      }
    this.resetPaires();
  }

  if (type === 'jeu') {
    this.betConfig.partnerHasJeu = value;

    if (!value) {
      this.conditionalMode['jeu'] = false;
    }

    if(this.evState.jeu.loading) {
    this.requestIds.jeu++;
    }
    this.resetJeu();
  }
}

  setMode(ev: any) {
  const value = ev?.detail?.value;

  if (value === 'start' || value === 'bet') {
    this.mode = value;

    if (value === 'bet' && this.betConfig.partnerHasPairs === null) {
      this.betConfig.partnerHasPairs = false;
    }

    if (value === 'bet' && this.betConfig.partnerHasJeu === null) {
      this.betConfig.partnerHasJeu = false;
    }
  }
}

  conditionalMode: Record<BlockKey, boolean> = {
    grand: false,
    petit: false,
    paires: false,
    jeu: false
  };
  
  j3Cards: number[] = [];                   // fileId 1..40 affichés en haut (si choisi)

  simOverlayOpen = false;
  simJ2Cards: number[] = [];
  simJ3Cards: number[] = [];                // si j3 simulé, on l’affiche dans l’overlay “dans le cadre”
  simJ4Cards: number[] = [];
  simDisplay = '';

  musRuns: Array<{
    title: string;      // ex: "Je jette 4 et 7"
    display: string;    // texte API
    iterations: number;
    ts: number;
  }> = [];

  form = this.fb.group({
    // hand_j1[4]
    j1_0: [0, [Validators.required]],
    j1_1: [0, [Validators.required]],
    j1_2: [0, [Validators.required]],
    j1_3: [0, [Validators.required]],

    // hand_j3 (on le saisit en "liste" simple : 0,1,2)
    hand_j3_csv: ['0', [Validators.required]],

    seed: [0, [Validators.required]],
    iterations: [1, [Validators.required, Validators.min(1), Validators.max(5000000)]],
  });

// Images de cartes
cardImageUrl(cardId: number): string {
  return `assets/cards/${cardId}.png`;
}

// Ta main joueur 1 : ici on se base sur le form, mais tu peux aussi venir de result.*
get handJ1(): number[] {
  const v = this.form.getRawValue();
  return [Number(v.j1_0), Number(v.j1_1), Number(v.j1_2), Number(v.j1_3)];
}

constructor(private fb: FormBuilder, private api: ApiService, private router: Router, private modalCtrl: ModalController) {
  this.clearAll();
}


private pop = inject(PopoverController);

enterMintza() { 
  this.actionMode = 'mintza'; 
  this.inputMode = 'none';
}
enterMus() { 
  this.actionMode = 'mus';
    this.inputMode = 'none';
}
exitMode() {
  // 1) revenir en home
  this.actionMode = 'home';
  this.showLongPressHint = true;

  // 2) revenir au clavier d'origine (fan)
  this.inputMode = 'compact';
  this.inputTarget = 'j1';

  // 3) retirer le partenaire (J3) + choix partenaire
  this.partnerFixed = false;
  this.j3Values = [];
  this.j3Cards = [];

  // 4) fermer overlays
  this.musOverlayOpen = false;
  this.simOverlayOpen = false;
  this.overlayNewHandVisible = false; // si tu l'as encore quelque part

  // 5) nettoyer résultats / écran principal (sans toucher à J1)
  this.errorMsg = null;
  this.loading = false;

  // Mus
  this.musResult = null;
  this.musNewHandValues = [];
  this.musNewHandCards = [];
  this.musRuns = [];                 // historique Mus si tu veux tout effacer

  // Mintza
  this.result = null;                // si ton affichage "blocks" lit this.result
  this.simDisplay = '';
  this.simJ2Cards = [];
  this.simJ3Cards = [];
  this.simJ4Cards = [];
  this.simHasMultiRun = false;

  // Estimations (paires / jeu)
  this.pairesEstimateText = '';
  this.jeuEstimateText = '';
  this.fauxJeuEstimateText = '';

  // Cumul jeu
  this.resetCondJeuAcc();
  this.condJeuAdvDone = { adv1: false, adv2: false };

  // Paris
  this.resetBetState();
  this.evJeuAdvDone = { adv1: false, adv2: false };

  // 6) selections/états UI
  this.discardIndexes?.clear?.();

  // 7) reset checkbox "partenaire pas mieux"
  this.resetConditionalModes();

  // 8) IMPORTANT : on conserve J1 (valeurs + cartes)
  // -> ne touche pas à selectedValues / handJ1Cards
}

resetConditionalModes() {
  this.conditionalMode = {
    grand: false,
    petit: false,
    paires: false,
    jeu: false
  };
}

onConditionalToggle(type: BlockKey, value: boolean) {
  this.conditionalMode[type] = value;

  if (type === 'jeu') {
    if(this.evState.jeu.loading) {
      this.requestIds.jeu++;
    }
    this.resetJeu();
  }

  if (type === 'paires') {
    if(this.evState.paires.loading) {
      this.requestIds.paires++;
    }
    this.resetPaires();
  }

  // optionnel mais propre :
  if (type === 'grand' || type === 'petit') {
    // pas de reset API, juste recalcul affichage
  }
}

run(iterations: number) {
  if (iterations >= 10000) this.showLongPressHint = false;
  this.errorMsg = null;
  // this.result = null;

  if (this.form.invalid) {
    this.errorMsg = 'Paramètres invalides.';
    return;
  }

  const payload = this.buildPayload(iterations);
  if (!payload) return;

  this.loading = true;

  this.api.simulateSimul1(payload).subscribe({
    next: (res) => {
  this.loading = false;
  const r: any = res;

  // display différent selon unique/multi
  this.simDisplay = (iterations === 1)
    ? this.displaySingleFromResults(r.results)
    : (r.display ?? "");

  // MULTI : on affiche sur l'écran (tes ion-card "blocks") et on sort
  if (iterations >= 10000) {
    this.mode = 'start';
    this.resetBetConfig();
    this.result = r;
    this.simOverlayOpen = false;
    this.simHasMultiRun = true;   // pour désactiver “Choisir main partenaire” si tu veux
    this.resetConditionalModes();
    return;
  }

  // UNIQUE : overlay + cartes
  const hv = r.hands_values;
  if (!hv) { this.errorMsg = "L'API ne renvoie pas hands_values."; return; }

  const used = new Set<number>();
  for (const id of this.handJ1Cards.slice(0, 4)) used.add(id);
  if (this.partnerFixed) for (const id of this.j3Cards.slice(0, 4)) used.add(id);

  this.simJ2Cards = this.buildHandFileIdsFromValues(hv.j2 ?? [], used);
  this.simJ4Cards = this.buildHandFileIdsFromValues(hv.j4 ?? [], used);
  this.simJ3Cards = (!this.partnerFixed && hv.j3)
    ? this.buildHandFileIdsFromValues(hv.j3, used)
    : [];

  this.simOverlayOpen = true;
  // reset checkbox
    this.resetConditionalModes();
    },
    error: (e: Error) => {
      this.loading = false;
      this.errorMsg = e.message || 'Erreur.';
    }
  });
}

resetBetConfig() {
  this.betConfig = {
    advHasPairs: null,
    advHasJeu: null,
    partnerHasPairs: false,
    partnerHasJeu: false,
    partnerLeqMe: false
  };
}

runMus(iterations: number): void {
  if (iterations >= 10000) this.showLongPressHint = false;
  this.refreshHandJ1Cards();
  this.errorMsg = null;

  const payload = this.buildMusPayload(iterations);
  if (!payload) {
    this.errorMsg = "Main incomplète (4 cartes nécessaires).";
    this.loading = false;
    return;
  }
  const keepMask = payload.keep_mask;
  if (keepMask.every(k => k === true)) {
    this.errorMsg = "Sélectionne au moins une carte à jeter.";
    setTimeout(() => this.errorMsg = null, 2000);
    this.loading = false;
    return;
  }

  this.loading = true;

  this.api.simulateMus(payload).subscribe({
    next: (res) => {
      this.musResult = res as any;
      this.loading = false;

  // cas multi : on affiche display
  if (iterations >= 10000) {
  this.musResult = res as any;

  const title = this.buildDiscardLabel(keepMask);
  this.musRuns.unshift({
    title,
    display: (res as any).display ?? "",
    iterations,
    ts: Date.now(),
  });

  return;
}


// cas unique : on attend final_hand (valeurs 1..10)
const final_hand = (res as any).final_hand as number[] | undefined;
if (!final_hand || final_hand.length !== 4) {
  this.errorMsg = "La simulation unique ne renvoie pas final_hand.";
  return;
}

this.musNewHandValues = final_hand;

// cartes actuelles (main d'origine) : fileId 1..40
const current = this.handJ1Cards.slice(0, 4);
if (current.length !== 4) {
  this.errorMsg = "Main affichée invalide (handJ1Cards).";
  return;
}

// kept + forbidden (cartes jetées, qu'on refuse de reprendre)
const keptFileIds: number[] = [];
const forbidden = new Set<number>();
for (let i = 0; i < 4; i++) {
  if (keepMask[i]) keptFileIds.push(current[i]);
  else forbidden.add(current[i]);
}

// combien de nouvelles ?
const k = 4 - keptFileIds.length;
const drawnValues = final_hand.slice(4 - k); // les k dernières

// construire LA MAIN SIMULÉE (resserrée) pour l'overlay uniquement
const simulated: number[] = keptFileIds.slice();
for (const v of drawnValues) {
  const id = this.chooseColorFileIdAvoiding(v, simulated, forbidden);
  simulated.push(id);
}

// 👉 on n'écrase PAS la main d'origine
this.musNewHandCards = simulated;      // 4 cartes dans l’overlay
this.musOverlayOpen = true;            // ou overlayNewHandVisible = true selon tes noms
    },
    error: (e: Error) => {
      this.errorMsg = e.message || "Erreur.";
      this.loading = false;
    }
  });
}

runBetPaires() {
  const requestId = ++this.requestIds.paires;
  const base = this.buildPayload(1);
  if (!base) return;
  const isCond = this.conditionalMode['paires'];
  const base1 = 60000;
  const base2 = 160000;

  const iterations_adv1 = isCond ? base1 * 3 : base1;
  const iterations_adv2 = isCond ? base2 * 2 : base2;

  const body = {
    hand_j1: base.hand_j1,
    hand_j3: base.hand_j3,
    bet: 'paires' as const,

    partner_has_pairs: this.partnerFixed
      ? undefined
      : (this.betConfig.partnerHasPairs ?? false),

    no_better: isCond,

    iterations_adv1,
    iterations_adv2,
  };

  this.evState.paires.loading = true;
  this.evState.paires.done = false;

  this.api.simulateCondBetDoubleFiltered(body).subscribe({

    next: (r: any) => {

      // requête obsolète
      if (requestId !== this.requestIds.paires) {
        return;
      }

      const adv = this.betConfig.advHasPairs;
      const result = adv === 1 ? r.results.adv1 : r.results.adv2;

      this.lastPairesResult = result;

      if (adv === 1) {
        this.betPairesEstimateText =
          (r?.results?.adv1?.display ?? '')
            .replace(/^Contre.*?:\s*/, '');
      } else if (adv === 2) {
        this.betPairesEstimateText =
          (r?.results?.adv2?.display ?? '')
            .replace(/^Contre.*?:\s*/, '');
      }

      this.evState.paires.loading = false;
      this.evState.paires.done = true;
    },

    error: (err: any) => {

      // requête obsolète
      if (requestId !== this.requestIds.paires) {
        return;
      }

      console.error(err);

      this.betPairesEstimateText = 'Erreur API';
      this.evState.paires.loading = false;
    }
  });
}

runBetJeu() {
  this.hasCheckedRareCase = false;
  this.autoRunning = false;
  this.evState.jeu.loading = true;
  this.rareCaseMessage = null;
  this.showAutoRunButton = false;
  this.errorText = null;
  
  const base = this.buildPayload(1);
  if (!base) return;

  const hasJeu = this.teamHasJeu(this.result);

  // 🔴 CAS FAUX JEU
  if (!hasJeu) {

    const body = {
      iterations: 100000,
      hand_j1: base.hand_j1,
      hand_j3: base.hand_j3,
      no_better: this.conditionalMode['jeu'] === true
    };

    this.betFauxJeuEstimateText = 'Calculs en cours…';

    this.api.simulateFauxJeuFiltered(body).subscribe({
      next: (r: any) => {
        const display = (r?.display ?? '').toString();
        const matched = r?.matched_trials ?? 0;
        const iterations = r?.iterations ?? 0;
        this.evState.jeu.count = matched;
        const suffix =`\n(${matched.toLocaleString('fr-FR')} cf/${iterations.toLocaleString('fr-FR')} s)`;

        const winPct = (r?.me_pct ?? 0) + (r?.partner_pct ?? 0);

        // const result = r.results;
        this.lastFauxJeuResult = r;


        if (winPct < 1) {
          this.betFauxJeuEstimateText +=
            "\n⚠️ Aucune chance réaliste de gagner.\nL'espérance est inutile.";
        }
        // this. = winPct < 1;

        this.betFauxJeuEstimateText = display + suffix;
        this.evState.jeu.loading = false;
      },
      error: (err: any) => {
        console.error(err);
        this.betFauxJeuEstimateText = 'Erreur API';
      }
    });

    return;
  }

  // ✅ CAS NORMAL (jeu)
  this.runEvSimulation('jeu');
}

async showRareCasePrompt(type: BlockKey) {
  const ok = confirm(
    "Cas très rare.\n\nVoulez-vous lancer automatiquement 9 simulations supplémentaires pour affiner l'estimation ?"
  );

  if (ok) {
    await this.autoRun(type);
  }
}

async autoRun(type: BlockKey) {
  this.autoRunning = true;
  this.autoDone = false;

  this.autoStep = 1; // déjà 1er run fait

  for (let i = 0; i < 9; i++) {
    this.autoStep = i + 2; // 2 → 10
    await this.runEvSimulation(type);
  }

  this.autoRunning = false;
  this.autoDone = true;
}

removeMusRun(i: number) {
  this.musRuns.splice(i, 1);
  // si tu utilises OnPush :
  // this.musRuns = [...this.musRuns];
}

onEstimerPairesClick() {
  const body = this.buildPayloadEstimerPaires();
  if (!body) return;

  this.estimerLastRequest = body;
  this.estimerDisplayDouble = 'Calculs en cours…';

  this.api.simulateCondBetDouble(body).subscribe({
    next: (r) => {
      this.estimerLastResponse = r;
      this.estimerDisplayDouble = r.display_double ?? '';
    },
    error: (err) => {
      this.estimerDisplayDouble = 'Erreur API';
      console.error(err);
    }
  });
}

private fmtPct1(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return `${n.toFixed(1).replace(".", ",")}%`;
}

public hasMyPairs(): boolean {
  const cards = this.handJ1Cards;
  if (!cards || cards.length === 0) return false;

  // convertir en rang 1..10 (mais sans fusion figures)
  const ranks = cards.map(c => ((c - 1) % 10) + 1);

  const counts: Record<number, number> = {};

  for (const r of ranks) {
    counts[r] = (counts[r] || 0) + 1;
    if (counts[r] >= 2) return true;
  }

  return false;
}

private hasPartnerPairs(r: any): boolean {
  if (!this.partnerFixed) return false;
  return (r?.paires_j3 ?? 0) > 0;
}

private teamHasPaires(r: any): boolean {
  return (r?.paires_j1 ?? 0) > 0 || (this.partnerFixed && (r?.paires_j3 ?? 0) > 0);
}

public hasMyJeu(): boolean {
  const values = this.handJ1Values;
  if (!values || values.length === 0) return false;

  const score = values.reduce((sum, v) => sum + v, 0);
  return score > 30;
}

private hasPartnerJeu(r: any): boolean {
  if (!this.partnerFixed) return false;
  return (r?.jeu_j3 ?? 0) > 30;
}

private teamHasJeu(r: any): boolean {
  return (r?.jeu_j1 ?? 0) > 30 || (this.partnerFixed && (r?.jeu_j3 ?? 0) > 30);
}

private suitLabelFromFileId(fileId: number): string {
  const s = Math.floor((fileId - 1) / 10);
  return ["épées", "bâtons", "coupes", "deniers"][s] ?? "?";
}

private valueFromFileId(fileId: number): number {
  return ((fileId - 1) % 10) + 1;
}

private buildDiscardLabel(keepMask: boolean[]): string {
  const current = this.handJ1Cards.slice(0, 4);
  const discardedValues: number[] = [];

  for (let i = 0; i < 4; i++) {
    if (!keepMask[i]) {
      const id = current[i];
      const v = ((id - 1) % 10) + 1;      // valeur technique 1..10
      discardedValues.push(this.toMusLabelValue(v)); // valeur Mus
    }
  }

  if (!discardedValues.length) return "Je ne jette rien";

  const parts = discardedValues.map(String);
  const nice =
    parts.length === 1 ? parts[0]
    : parts.length === 2 ? `${parts[0]} et ${parts[1]}`
    : `${parts.slice(0, -1).join(", ")} et ${parts[parts.length - 1]}`;

  return `Je jette : ${nice}`;
}

private toMusLabelValue(v: number): number {
  if (v <= 7) return v;
  return v + 2; // 8→10, 9→11, 10→12
}

clearAll() {
  this.selectedValues = [];
  this.patchHandToForm([]);
  this.refreshHandJ1Cards();
}

private eraseTimer: any = null;

onEraseDown() {
  if (!this.hasAnyCard) return;
  this.eraseTimer = setTimeout(() => {
    this.clearAll();
    this.eraseTimer = null;
  }, 600); // 600ms = appui long
}

onEraseUp() {
  if (this.eraseTimer) {
    clearTimeout(this.eraseTimer);
    this.eraseTimer = null;
  }
}

selectedValues: number[] = []; // valeurs 1..10 tapées par l’utilisateur (max 4)

// Labels affichés dans le keypad (Mus)
keypadKeys: { label: string; value: number }[] = [
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 },
  { label: '5', value: 5 },
  { label: '6', value: 6 },
  { label: '7', value: 7 },
  { label: '10', value: 8 }, // index 8 = 10
  { label: '11', value: 9 }, // index 9 = cavalier
  { label: '12', value: 10 }, // index 10 = roi
];

get isInputOpen(): boolean {
  return (
    this.inputMode === 'keypad' ||
    this.inputMode === 'compact'
  );
}

get canEstimatePaires(): boolean {
  return this.teamHasPaires(this.result);
}

get showJeuHelp(): boolean {
  return this.teamHasJeu(this.result);
}

get advPairesText(): string {
  const r: any = this.result; // ou la dernière réponse simul1 (multi)
  if (!r?.adv_stats?.paires) return "";

  const adv = r.adv_stats.paires;
  const has = this.teamHasPaires(r);

  if (has) {
    return [
      "Vous avez des paires.",
      "La probabilité que n adversaires aient des paires est :",
      `n=0|${this.fmtPct1(adv.adv0_pct)}, n=1|${this.fmtPct1(adv.adv1_pct)}, n=2|${this.fmtPct1(adv.adv2_pct)}`,
      "Vous pouvez estimer vos chances de l'emporter contre 1 ou 2 adversaires."
    ].join("\n");
  } else {
    return [
      "Vous n'avez pas de paires.",
      `La probabilité que vos adversaires n'aient pas de paires est ${this.fmtPct1(adv.adv0_pct)}.`
    ].join("\n");
  }
}

get advJeuText(): string {
  const r: any = this.result;
  if (!r?.adv_stats?.jeu) return "";

  const adv = r.adv_stats.jeu;
  const has = this.teamHasJeu(r);

  if (has) {
    return [
      "Vous avez le jeu.",
      "La probabilité que n adversaires aient le jeu est :",
      `n=0|${this.fmtPct1(adv.adv0_pct)}, n=1|${this.fmtPct1(adv.adv1_pct)}, n=2|${this.fmtPct1(adv.adv2_pct)}`,
      "Vous pouvez estimer vos chances de l'emporter contre 1 ou 2 adversaires."
    ].join("\n");
  } else {
    return [
      "Vous n'avez pas le jeu.",
      `La probabilité que vos adversaires n'aient pas le jeu est ${this.fmtPct1(adv.adv0_pct)}.`,
      "Vous pouvez estimer vos chances de l'emporter au faux-jeu."
    ].join("\n");
  }
}

get hasAnyCard(): boolean {
  return this.selectedValues.length > 0;
}

get isComplete(): boolean {
  return this.selectedValues.length === 4;
}

getAdv(type: BlockKey): 0 | 1 | 2 | null {
  return type === 'paires'
    ? this.betConfig.advHasPairs
    : this.betConfig.advHasJeu;
}

getPartnerText(type: BlockKey): string {
  const has = this.hasPartnerReal(type);

  if (type === 'jeu') {
    return has ? "Partenaire a le jeu" : "Partenaire n'a pas le jeu";
  }

  return has ? "Partenaire a des paires" : "Partenaire n'a pas de paires";
}

getProbability(type: BlockKey): number {

  const tieAlpha =
    this.strategyToAlpha(
      this.selectedTieStrategy
    );

  // 🔴 PAIRES
  if (
    type === 'paires' &&
    this.lastPairesResult
  ) {

    const r = this.lastPairesResult;

    return (
      (r.me_pct ?? 0) +
      (r.partner_pct ?? 0) +
      (r.tie_pct ?? 0) * tieAlpha
    ) / 100;
  }

  // 🔴 JEU / FAUX-JEU
  if (type === 'jeu') {
    const isFauxJeu = !this.teamHasJeu(this.result);

    // ===== FAUX-JEU =====
    if (isFauxJeu) {
      const r = this.lastFauxJeuResult;
      if (!r) return 0;

      return (
        (r.me_pct ?? 0) +
        (r.partner_pct ?? 0) +
        (r.tie_pct ?? 0) * tieAlpha
      ) / 100;
    }

    // ===== JEU NORMAL =====
    const adv = this.betConfig.advHasJeu;
    const stats = this.evJeuAcc[adv === 1 ? 'adv1' : 'adv2'];
    if (!stats || stats.matched_trials === 0) {
      return 0;
    }

    return (
      stats.me +
      stats.partner +
      tieAlpha * stats.tie
    ) / stats.matched_trials;
  }

  // 🔵 GRAND / PETIT
  const stats = this.getStats(type)!;
  if (!this.conditionalMode[type]) {
    return (
      stats.me_pct +
      stats.partner_pct +
      stats.tie_pct * tieAlpha
    ) / 100;
  }

  return (
    (stats.cond_me_pct ?? 0) +
    (stats.cond_tie_pct ?? 0) * tieAlpha
  ) / 100;
}

getDisplayedStats(type: BlockKey) {

  const stats = this.getStats(type);
  if (!stats) return null;

  if (!this.conditionalMode[type]) {
    return stats;
  }

  const total = stats.cond_total ?? 0;

  const me = Math.round((stats.cond_me_pct ?? 0) * total / 100);
  const tie = Math.round((stats.cond_tie_pct ?? 0) * total / 100);
  const lose = Math.round((stats.cond_lose_pct ?? 0) * total / 100);

  return {
    ...stats,
    me,
    partner: 0,
    tie,
    lose,
    me_pct: stats.cond_me_pct ?? 0,
    partner_pct: 0,
    tie_pct: stats.cond_tie_pct ?? 0,
    lose_pct: stats.cond_lose_pct ?? 0
  };

}

getBetStats(type: BlockKey) {

  const stats = this.getDisplayedStats(type);
  if (!stats) return null;

  // 🔴 pas de coche activé
  if (!this.conditionalMode[type]) {
    return stats;
  }

  // 🔴 appliquer "n’a pas mieux"
  return this.applyNoBetter(stats);
}

private applyNoBetter(stats: any) {

  const me = stats.me ?? 0;
  const tie = stats.tie ?? 0;
  const lose = stats.lose ?? 0;

  const total = me + tie + lose;

  if (total === 0) return stats;

  return {
    me,
    partner: 0, // 🔴 disparaît
    tie,
    lose,

    me_pct: (me / total) * 100,
    partner_pct: 0,
    tie_pct: (tie / total) * 100,
    lose_pct: (lose / total) * 100
  };
}

canUseConditional(type: BlockKey): boolean {

  if (this.partnerFixed) return false;

  // PAIRES
  if (type === 'paires') {
    if (!this.betConfig.partnerHasPairs) return false;
  }

  // JEU
  if (type === 'jeu') {

    const adv = this.betConfig.advHasJeu;

    const teamHasJeu =
      this.hasMyJeu() ||
      (this.partnerFixed
        ? this.hasPartnerJeuReal()
        : this.betConfig.partnerHasJeu === true);

    // ✅ autoriser faux-jeu
    if (!teamHasJeu && adv === 0) {
      return true;
    }

    // sinon logique normale
    if (!this.betConfig.partnerHasJeu) return false;
  }

  const stats = this.getStats(type);
  if (!stats) return false;

  return stats.me_pct > 20;
}

openKeypad() {
  this.inputMode = 'keypad';
}

closeKeypad() {
  // si on était en saisie partenaire et que c'est incomplet -> on annule
  if (this.inputTarget === 'j3' && (this.j3Values?.length ?? 0) !== 4) {
    this.partnerFixed = false;
    this.j3Values = [];
    this.j3Cards = [];
  }

if (this.actionMode === 'mintza') {
    this.inputMode = 'none';
  } else {
    this.inputMode = 'compact';
  }
  this.inputTarget = 'j1';
}

clearHand() {
  this.selectedValues = [];
  this.patchHandToForm([0, 0, 0, 0]); // ou [1,1,1,1] selon ton choix
  this.refreshHandJ1Cards();
}

randomHand() {
  // valeurs 1..10 (uniforme). Tu peux raffiner plus tard (distribution Mus)
  const vals: number[] = [];
  for (let i = 0; i < 4; i++) vals.push(1 + Math.floor(Math.random() * 10));
  this.selectedValues = vals;
  this.patchHandToForm(vals);
  this.refreshHandJ1Cards();
}

j3Values: number[] = []; // valeurs 1..10 (max 4)

countValueEverywhere(value: number): number {

  let count = 0;

  for (const v of this.selectedValues) {
    if (v === value) count++;
  }

  for (const v of this.j3Values) {
    if (v === value) count++;
  }

  return count;
}

tapKey(v: number) {

  // 🔴 impossible d'avoir plus de 4 cartes identiques
  if (this.countValueEverywhere(v) >= 4) {

    console.warn('Impossible : les 4 cartes existent déjà');

    return;
  }

  if (this.inputTarget === 'j3') {

    if (this.j3Values.length >= 4) return;

    this.j3Values.push(v);

    this.refreshJ3Cards();

    if (this.j3Values.length === 4) {
      this.inputMode = 'none';
    }

    return;
  }

  // J1

  if (this.selectedValues.length >= 4) return;

  this.selectedValues.push(v);

  this.patchHandToForm(this.selectedValues);

  this.refreshHandJ1Cards();

  if (this.selectedValues.length === 4) {
    this.inputMode = 'compact';
  }
}

backspace() {
  if (this.inputTarget === 'j3') {
    if (!this.j3Values.length) return;
    this.j3Values.pop();
    this.refreshJ3Cards();
    return;
  }

  // J1 (ton comportement actuel)
  if (!this.selectedValues.length) return;
  this.selectedValues.pop();
  this.refreshHandJ1Cards();
}

discardIndexes = new Set<number>(); // indices 0..3 sélectionnés

toggleDiscard(i: number) {
  if (this.actionMode !== 'mus') return;
  if (this.discardIndexes.has(i)) this.discardIndexes.delete(i);
  else this.discardIndexes.add(i);
}

isDiscarded(i: number): boolean {
  return this.discardIndexes.has(i);
}

// Met à jour le form j1_0..j1_3 sans afficher les inputs
private patchHandToForm(vals: number[]) {
  const v: (number | null)[] = [null, null, null, null];
  for (let i = 0; i < Math.min(4, vals.length); i++) v[i] = vals[i];

  this.form.patchValue(
    { j1_0: v[0], j1_1: v[1], j1_2: v[2], j1_3: v[3] },
    { emitEvent: false }
  );
}

private chooseColorFileIdAvoiding(value1to10: number, alreadyChosen: number[], forbidden: Set<number>): number {
  const usedSuits = new Set(alreadyChosen.map(id => this.suitFromFileId(id)));
  const all: (0|1|2|3)[] = [0,1,2,3];

  // 1) essayer d'abord les suits pas encore utilisés dans la main
  const availableSuits = all.filter(s => !usedSuits.has(s));
  const suitsToTry = availableSuits.length ? availableSuits : all;

  for (const s of suitsToTry) {
    const id = this.toFileId(value1to10, s);
    if (!forbidden.has(id)) return id;
  }

  // 2) si rien trouvé, tenter n'importe quel suit non forbidden (même si déjà utilisé dans la main)
  for (const s of all) {
    const id = this.toFileId(value1to10, s);
    if (!forbidden.has(id)) return id;
  }

  // 3) cas impossible: les 4 cartes de cette valeur sont déjà utilisées globalement
  // => doublon inévitable avec une API "valeurs seulement"
  return this.toFileId(value1to10, all[0]);
}

  // ----- Cartes affichées (id 1..40) -----
  handJ1Cards: number[] = [];

  // Valeurs de la main joueur 1 pour l'API (1..10)
  get handJ1Values(): number[] {
  const v = this.form.getRawValue();

  return [v.j1_0, v.j1_1, v.j1_2, v.j1_3].map(x => {
    const val = Number(x);

    // Mus : 8, 9, 10 → valent 10
    return val >= 8 ? 10 : val;
  });
}

  get handJ3Values(): number[] {
    if (!this.j3Cards || this.j3Cards.length === 0) return [];

    return this.j3Cards.map(c => {
      const rank = ((c - 1) % 10) + 1;

      // Mus : 8, 9, 10 → valent 10
      return rank >= 8 ? 10 : rank;
    });
  }

  get handJ1PairValues(): number[] {
    const v = this.form.getRawValue();
    return [v.j1_0, v.j1_1, v.j1_2, v.j1_3].map(x => Number(x));
  }

  get handJ3PairValues(): number[] {
    if (!this.j3Cards || this.j3Cards.length === 0) {
      return [];
    }

    return this.j3Cards.map(c => {
      const rank =
        ((c - 1) % 10) + 1;

      // paires :
      // vraies valeurs 1..10
      return rank;
    });
  }

  getMyPairsInfo() {
    const values = this.handJ1PairValues;    
    const counts: Record<number, number> = {};

    for (const v of values) {
      counts[v] = (counts[v] || 0) + 1;
    }

    let pairs: number[] = [];
    let hasMedes = false;

    for (const val in counts) {
      const count = counts[val];

      if (count === 2) {
        pairs.push(Number(val));
      }

      if (count >= 3) {
        hasMedes = true;
      }
    }

    return {
      pairs,               // ex: [3] ou [2,6]
      hasMedes,
      bestPair: pairs.length ? Math.max(...pairs) : 0,
      isDoublePair: pairs.length >= 2
    };
  }

  get pairsInfo() {
    return this.getMyPairsInfo();
  }

  private getPairsRank(values: number[]): number {
  const counts: Record<number, number> = {};
  for (const v of values) {
    counts[v] = (counts[v] || 0) + 1;
  }
  const pairs: number[] = [];
  let medes = 0;
  for (const val in counts) {
    const c = counts[val];
    if (c === 2) {
      pairs.push(Number(val));
    }

    if (c >= 3) {
      medes = Number(val);
    }
  }

  // doubles paires
  if (pairs.length >= 2) {
    const sorted = [...pairs].sort((a, b) => b - a);
    return 300 + sorted[0] * 10 + sorted[1];
  }

  // mèdes
  if (medes > 0) {
    return 200 + medes;
  }

  // paire simple
  if (pairs.length === 1) {
    return 100 + pairs[0];
  }
  return 0;
}

  getMyPairsPoints(): number {
    const values = this.handJ1PairValues;
    const counts: Record<number, number> = {};
    for (const v of values) {
      counts[v] = (counts[v] || 0) + 1;
    }
    const occurrences = Object.values(counts).sort((a, b) => b - a);

    // doubles paires (2+2)
    if (occurrences[0] === 2 && occurrences[1] === 2) return 3;

    // mèdes (3 cartes)
    if (occurrences[0] === 3) return 2;

    // paire simple
    if (occurrences[0] === 2) return 1;

    return 0;
  }

  getPartnerPairsPoints(): number {
    const values = this.handJ3PairValues;
    const counts: Record<number, number> = {};
    for (const v of values) {
      counts[v] = (counts[v] || 0) + 1;
    }
    const occurrences = Object.values(counts).sort((a, b) => b - a);

    // doubles paires (2+2)
    if (occurrences[0] === 2 && occurrences[1] === 2) return 3;

    // mèdes (3 cartes)
    if (occurrences[0] === 3) return 2;

    // paire simple
    if (occurrences[0] === 2) return 1;

    return 0;
  }

  getMyJeuValue(): number {
    const values = this.handJ1Values;
    let total = 0;

    for (const v of values) {
      total += v;
    }

    return total;
  }

  getPartnerJeuValue(): number {
    const values = this.handJ3Values;
    let total = 0;

    for (const v of values) {
      total += v;
    }

    return total;
  }

  private getJeuRank(v: number): number {
  const order = [
    31,
    32,
    40,
    37,
    36,
    35,
    34,
    33
  ];
  return order.indexOf(v);
}

  getMyJeuPoints(): number {
    const values = this.handJ1Values;

    const sum = values.reduce((a, b) => a + b, 0);

    if (sum === 31) return 3;
    if (sum > 30) return 2;

    return 0;
  }


  // Type interne pour index couleur 0..3
  private suits: (0 | 1 | 2 | 3)[] = [0, 1, 2, 3];

  private toFileId(value1to10: number, suit: 0 | 1 | 2 | 3): number {
    return suit * 10 + value1to10; // 1..40
  }

  private suitFromFileId(fileId1to40: number): 0 | 1 | 2 | 3 {
    return Math.floor((fileId1to40 - 1) / 10) as 0 | 1 | 2 | 3;
  }

  cardImageUrlFromFileId(fileId1to40: number): string {
    return `assets/cards/${fileId1to40}.png`;
  }

  private chooseColorFileId(value1to10: number, existingFileIds: number[]): number {
    const usedSuits = new Set(existingFileIds.map(id => this.suitFromFileId(id)));
    const available = this.suits.filter(s => !usedSuits.has(s));
    const candidates = available.length ? available : this.suits;
    const suit = candidates[Math.floor(Math.random() * candidates.length)];
    return this.toFileId(value1to10, suit);
  }

  private buildKeepMask4(): boolean[] {
  const keepMask = [true, true, true, true];
  for (const idx of this.discardIndexes) {
    if (idx >= 0 && idx < 4) keepMask[idx] = false;
  }
  return keepMask;
}

private applyFinalHandValues(finalValues: number[], keepMask: boolean[]) {
  const current = this.handJ1Cards.slice(); // fileId 1..40 (4 cartes)

  // Kept + Forbidden (jetées)
  const keptFileIds: number[] = [];
  const forbidden = new Set<number>();

  for (let i = 0; i < 4; i++) {
    if (keepMask[i]) keptFileIds.push(current[i]);
    else forbidden.add(current[i]);
  }

  // Main resserrée : kept d'abord
  const result: number[] = keptFileIds.slice();

  // Combien de nouvelles ?
  const k = 4 - keptFileIds.length;
  if (k <= 0) {
    // rien à faire
    return;
  }

  // L'API renvoie final_hand = kept + drawn (valeurs 1..10)
  // Les k dernières sont donc les nouvelles.
  const drawnValues = finalValues.slice(4 - k);

  // On construit les nouvelles cartes (fileId) en évitant forbidden
  const newCardsFileIds: number[] = [];
  for (const v of drawnValues) {
    const id = this.chooseColorFileIdAvoiding(v, result, forbidden);
    result.push(id);
    newCardsFileIds.push(id);
  }

  // Update UI
  this.handJ1Cards = result;

  // Overlay "nouvelle main" = seulement les nouvelles
  this.overlayNewHandCards = newCardsFileIds;
  this.overlayNewHandVisible = true;

  // Reset discard pour le prochain tour
  this.discardIndexes.clear();
}


  private simTimer: any = null;

simulateOnce() {
  if (this.actionMode === 'mus') this.runMus(1);
  else this.run(1);
}


simulateMany() {
  if (this.actionMode === 'mus') {
    this.runMus(10000);
  } else {
    this.setIterations(10000);
    this.run(10000);
  }
}

private simHoldTimer: any = null;
private simLongPressFired = false;
private readonly SIM_LONGPRESS_MS = 450;

onSimDown() {
  if (this.loading) return;

  this.simLongPressFired = false;
  this.simHoldTimer = setTimeout(() => {
    this.simLongPressFired = true;

    if (this.actionMode === 'mus') this.runMus(10000);
    else if (this.actionMode === 'mintza') this.run(10000);

  }, this.SIM_LONGPRESS_MS);
}

onSimUp() {
  if (this.simHoldTimer) {
    clearTimeout(this.simHoldTimer);
    this.simHoldTimer = null;
  }
  if (this.simLongPressFired) return;

  if (this.actionMode === 'mus') this.runMus(1);
  else if (this.actionMode === 'mintza') this.run(1);
}

private displaySingleFromResults(results: any): string {
  const pick = (o: any) => {
    // un des 4 compteurs sera 1 en itération unique
    if (o.me) return "😁";
    if (o.partner) return "🙂😉";
    if (o.tie) return "👏";
    return "😭";
  };

  return [
    `grand ${pick(results.grand)}`,
    `petit ${pick(results.petit)}`,
    `paire ${pick(results.paires)}`,
    `jeu ${pick(results.jeu)}`,
  ].join('\n');
}

private toTuple4(a: number[]): [number, number, number, number] | null {
  if (a.length !== 4) return null;
  return [a[0], a[1], a[2], a[3]];
}

private buildPayload(iterations: number) {
  let seed = Number(this.form.getRawValue().seed);
  if (!seed) seed = Date.now();   // nouveau tirage à chaque clic si seed vide/0

  const j1 = this.toTuple4(this.selectedValues.slice(0, 4));
  if (!j1) {
    this.errorMsg = "Main incomplète (J1 : 4 cartes nécessaires).";
    return null;
  }

  let j3: [number, number, number, number] | null = null;
  if (this.partnerFixed) {
    const t = this.toTuple4(this.j3Values.slice(0, 4));
    if (!t) {
      this.errorMsg = "Main partenaire incomplète (J3 : 4 cartes nécessaires).";
      return null;
    }
    j3 = t;
  }

  return {
    iterations,
    seed,
    hand_j1: j1,
    hand_j3: j3,
  };
}

private buildPayloadEstimerPaires(): SimCondBetDoubleRequest | null {
  const j1 = this.toTuple4(this.selectedValues.slice(0, 4));
  if (!j1) {
    this.errorMsg = "Main incomplète (J1 : 4 cartes nécessaires).";
    return null;
  }

  let j3: [number, number, number, number] | null = null;
  if (this.partnerFixed) {
    const t = this.toTuple4(this.j3Values.slice(0, 4));
    if (!t) {
      this.errorMsg = "Main partenaire incomplète (J3 : 4 cartes nécessaires).";
      return null;
    }
    j3 = t;
  }

  return {
    hand_j1: j1,
    hand_j3: j3,
    bet: 'paires',
    iterations_adv1: 30000,
    iterations_adv2: 80000,
  };
}

private setIterations(n: number) {
  this.form.patchValue({ iterations: n }, { emitEvent: false });
}

private buildMusPayload(iterations: number) {
  // hand_j1 values 1..10 (comme ton API simul1)
  const vals = this.selectedValues.slice(0, 4);
  if (vals.length !== 4) return null;

  const hand_j1: [number, number, number, number] = [vals[0], vals[1], vals[2], vals[3]];

  const keep_mask: [boolean, boolean, boolean, boolean] = [
    !this.discardIndexes.has(0),
    !this.discardIndexes.has(1),
    !this.discardIndexes.has(2),
    !this.discardIndexes.has(3),
  ];

let seed = Number(this.form.getRawValue().seed);
if (!seed) seed = Date.now(); // relance différente à chaque appel si l'utilisateur ne force pas un seed

  return { iterations, hand_j1, keep_mask, seed };
}

private buildHandFileIdsFromValues(values: number[], usedGlobal: Set<number>): number[] {
  const hand: number[] = [];
  for (const v of values) {
    const id = this.chooseColorFileIdAvoiding(v, hand, usedGlobal);
    hand.push(id);
    usedGlobal.add(id);
  }
  return hand;
}

private addToCondJeuAcc(key: AdvKey, advRes: any) {

  if (!advRes) return;

  const acc = this.condJeuAcc[key];

  acc.iterations += Number(advRes.iterations ?? 0);
  acc.matched_trials += Number(advRes.matched_trials ?? 0);

  acc.me += Number(advRes.me ?? 0);
  acc.partner += Number(advRes.partner ?? 0);
  acc.tie += Number(advRes.tie ?? 0);
  acc.lose += Number(advRes.lose ?? 0);

  acc.team_points_sum += Number(advRes.team_points_sum ?? 0);

  acc.opp_points_lose_sum += Number(advRes.opp_points_lose_sum ?? 0);
  acc.opp_points_all_sum += Number(advRes.opp_points_all_sum ?? 0);

  acc.team_win_count += Number(advRes.team_win_count ?? 0);

  acc.opp_lose_count += Number(advRes.opp_lose_count ?? 0);
  acc.opp_all_count += Number(advRes.opp_all_count ?? 0);

  if (acc.matched_trials >= this.condState.jeu.target) {
    this.condJeuAdvDone[key] = true;
  }
}

private addToEvJeuAcc(key: AdvKey, advRes: any) {

  if (!advRes) return;

  const acc = this.evJeuAcc[key];

  acc.iterations += Number(advRes.iterations ?? 0);
  acc.matched_trials += Number(advRes.matched_trials ?? 0);

  acc.me += Number(advRes.me ?? 0);
  acc.partner += Number(advRes.partner ?? 0);
  acc.tie += Number(advRes.tie ?? 0);
  acc.lose += Number(advRes.lose ?? 0);

  acc.team_points_sum += Number(advRes.team_points_sum ?? 0);

  acc.opp_points_lose_sum += Number(advRes.opp_points_lose_sum ?? 0);
  acc.opp_points_all_sum += Number(advRes.opp_points_all_sum ?? 0);

  acc.team_win_count += Number(advRes.team_win_count ?? 0);

  acc.opp_lose_count += Number(advRes.opp_lose_count ?? 0);
  acc.opp_all_count += Number(advRes.opp_all_count ?? 0);

  if (acc.matched_trials >= this.evState.jeu.target) {
    this.evJeuAdvDone[key] = true;
  }
}


// private addToJeuAcc(key: AdvKey, advRes: any) {
//   console.log("addToJeuAcc")
//   if (!advRes) return;

//   const acc = this.condJeuAcc[key];
//   acc.iterations += Number(advRes.iterations ?? 0);
//   acc.matched_trials += Number(advRes.matched_trials ?? 0);
//   acc.me += Number(advRes.me ?? 0);
//   acc.partner += Number(advRes.partner ?? 0);
//   acc.tie += Number(advRes.tie ?? 0);
//   acc.lose += Number(advRes.lose ?? 0);

//   // =========================
//   // 🔴 EV EQUIPE ET ADV
//   // =========================
  
//   acc.team_points_sum += Number(advRes.team_points_sum ?? 0);

//   acc.opp_points_lose_sum += Number(advRes.opp_points_lose_sum ?? 0);
//   acc.opp_points_all_sum += Number(advRes.opp_points_all_sum ?? 0);

//   acc.team_win_count += Number(advRes.team_win_count ?? 0);

//   acc.opp_lose_count += Number(advRes.opp_lose_count ?? 0);
//   acc.opp_all_count += Number(advRes.opp_all_count ?? 0);

//   // =========================

//   if (acc.matched_trials >= this.condState.jeu.target) {
//     this.condJeuAdvDone[key] = true;
//   }
// }

private pct(n: number, d: number): number {
  return d > 0 ? Math.round((n * 10000) / d) / 100 : 0;
}

private buildJeuLine(acc: CondAdv): string {
  const mePct = this.pct(acc.me, acc.matched_trials);
  const partnerPct = this.pct(acc.partner, acc.matched_trials);
  const tiePct = this.pct(acc.tie, acc.matched_trials);
  const losePct = this.pct(acc.lose, acc.matched_trials);

  const header = `Contre ${acc.adv} adversaire${acc.adv === 2 ? 's' : ''} :`;
  const line2 = `${Math.round(mePct)}😁 ${Math.round(partnerPct)}😀😉 ${Math.round(tiePct)}👏 ${Math.round(losePct)}😭`;
  const line3 = `(${this.fmtInt(acc.matched_trials)} cf/${this.fmtInt(acc.iterations)} s)`;

  return `${header}\n${line2}\n${line3}`;
}

private rebuildJeuDisplayDouble(): string {
  const a1 = this.condJeuAcc.adv1;
  const a2 = this.condJeuAcc.adv2;
  const l1 = this.buildJeuLine(this.condJeuAcc.adv1) + (this.condJeuAdvDone.adv1 ? ' 🎌' : '');
  const l2 = this.buildJeuLine(this.condJeuAcc.adv2) + (this.condJeuAdvDone.adv2 ? ' 🎌' : '');
  return `${l1}\n${l2}`;
}

private rebuildEvJeuDisplaySingle(): string {
  const adv = this.betConfig.advHasJeu;
  if (adv === 1) {
    return this.formatJeuAdv(this.evJeuAcc.adv1);
  }
  if (adv === 2) {
    return this.formatJeuAdv(this.evJeuAcc.adv2);
  }
  return '';
}

private formatJeuAdv(a: CondAdv): string {
  if (!a || a.matched_trials === 0) return '';

  const pct = (x: number) =>
    Math.round((x / a.matched_trials) * 100);

  const fmt = (n: number) =>
    n.toLocaleString('fr-FR');

  return `
  ${pct(a.me)}😀 ${pct(a.partner)}🙂😉 ${pct(a.tie)}👏 ${pct(a.lose)}😭
  (${fmt(a.matched_trials)} cf/${fmt(a.iterations)} s)
  `;
}

// PAIRES
pairesDisplayDouble = '';

// JEU
jeuDisplayDouble = '';
jeuDisplayFaux = '';

// private readonly JEU_THRESHOLD = 4000;
private condJeuAdvDone: Record<AdvKey, boolean> = { adv1: false, adv2: false };
private evJeuAdvDone: Record<AdvKey, boolean> = { adv1: false, adv2: false };

rerunMusFromOverlay() {
  // si tu veux forcer une nouvelle seed même si l'utilisateur a laissé seed=0
  // tu peux aussi ici mettre à jour un champ seed du form si tu veux le voir à l'écran.
  this.runMus(1);
}

refreshHandJ1Cards() {
  // Conserver les cartes déjà générées si elles existent
  const values = this.selectedValues.slice(0, 4);
  const next: number[] = [];

  for (let i = 0; i < values.length; i++) {
    const v = values[i];

    // Si on avait déjà une carte à cet index et qu'elle correspond à la même valeur, on la garde
    const existing = this.handJ1Cards[i];
    if (existing !== undefined) {
      const existingValue = ((existing - 1) % 10) + 1; // valeur 1..10 dans le bloc
      if (existingValue === v) {
        next.push(existing);
        continue;
      }
    }

    // Sinon on choisit une couleur libre, en tenant compte des cartes déjà fixées dans next
    next.push(this.chooseColorFileId(v, next));
  }

  this.handJ1Cards = next;
}

refreshJ3Cards() {
  const values = this.j3Values.slice(0, 4);
  const next: number[] = [];

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const existing = this.j3Cards[i];

    if (existing !== undefined) {
      const existingValue = ((existing - 1) % 10) + 1;
      if (existingValue === v) { next.push(existing); continue; }
    }
    next.push(this.chooseColorFileId(v, next)); // pas besoin du avoiding ici
  }
  this.j3Cards = next;
}

// ordre d’affichage
blocks: { key: BlockKey; title: string }[] = [
  { key: 'grand', title: 'Grand' },
  { key: 'petit', title: 'Petit' },
  { key: 'paires', title: 'Paires' },
  { key: 'jeu', title: 'Jeu' },
];

fmtPct(x: unknown): string {
  if (typeof x !== 'number' || !isFinite(x)) return '—';
  return `${x.toFixed(2)}%`;
}

fmtInt(x: unknown): string {
  if (typeof x !== 'number' || !isFinite(x)) return '—';
  return Math.round(x).toLocaleString('fr-FR'); // => 7 466 (avec espace fine)
}

getStats(block: BlockKey): OutcomeStats | null {
  const r = this.result?.results?.[block];
  return r && typeof r === 'object' ? (r as OutcomeStats) : null;
}

get musDisplay(): string {
  return (this.musResult?.display ?? '');
}

get isKeypadFull(): boolean {
  return (this.inputTarget === 'j3' ? this.j3Values.length : this.selectedValues.length) >= 4;
}

get hasAnyCardForTarget(): boolean {
  return (this.inputTarget === 'j3' ? this.j3Values.length : this.selectedValues.length) > 0;
}

nl2br(text: string): string {
  return text.replace(/\n/g, '<br>');
}

resolveTieDecision(
  context: JeuTieContext,
  answers: TieResolutionAnswers
): TieDecision {

  return {
    alpha: 0.5,
    resolvedStrategy: TieStrategy.MILIEU
  };
}

private buildTieContext(type: BlockKey): JeuTieContext {
  let advCount: 1 | 2 = 1;
  let partnerHas = false;
  let partnerIsDecisive = false;
  const partnerFixed = this.partnerFixed;
  let sharedTiePossible = false;
  let stats: any;

  if (type === 'jeu') {
    const isFauxJeu = this.betConfig.advHasJeu === 0;

    if (isFauxJeu) {
      stats = this.lastFauxJeuResult;
    } else {
      const adv = this.betConfig.advHasJeu;

      stats =
        this.evJeuAcc[
          adv === 1 ? 'adv1' : 'adv2'
        ];
    }

  } else if (type === 'paires') {

    stats = this.lastPairesResult;
  }

  // =========================
  // 🔴 PARTENAIRE FIXÉ
  // =========================

  if (partnerFixed) {

    // =====================
    // 🔴 JEU
    // =====================

    if (type === 'jeu') {
      const myValue = this.getMyJeuValue();
      const partnerValue = this.getPartnerJeuValue();
      const myRank = this.getJeuRank(myValue);
      const partnerRank = this.getJeuRank(partnerValue);

      // égalité réelle
      if (myValue === partnerValue) {
        sharedTiePossible = true;

      // partenaire meilleur
      } else if (partnerRank < myRank) {
        partnerIsDecisive = true;
      }
    }

    // =====================
    // 🔴 PAIRES
    // =====================

    if (type === 'paires') {
      const myPoints = this.getMyPairsPoints();
      const partnerPoints = this.getPartnerPairsPoints();
      const myRank = this.getPairsRank(this.handJ1PairValues);
      const partnerRank = this.getPairsRank(this.handJ3PairValues);

      // égalité réelle
      if (myRank === partnerRank) {
        sharedTiePossible = true;

      // partenaire meilleur
      } else if (partnerRank > myRank) {
        partnerIsDecisive = true;
      }
    }

  // =========================
  // 🔴 PARTENAIRE NON FIXÉ
  // =========================

  } else {
    const me = stats?.me_pct ?? stats.me ?? 0;
    const partner = stats?.partner_pct ?? stats.partner ?? 0;

    // vraie ambiguïté statistique
    const delta = Math.abs(me - partner);

    if (me > 0 && partner > 0 && delta < 5) {
      sharedTiePossible = true;

    // partenaire statistiquement dominant
    } else if (partner > me) {
      partnerIsDecisive = true;
    }
  }

  if (type === 'paires') {
    advCount = this.betConfig.advHasPairs === 2
      ? 2
      : 1;

    partnerHas = partnerFixed
        ? this.hasPartnerPairsReal()
        : (this.betConfig.partnerHasPairs ?? false);
  }

  if (type === 'jeu') {
    advCount = this.betConfig.advHasJeu === 2
      ? 2
      : 1;

    partnerHas = partnerFixed
        ? this.hasPartnerJeuReal()
        : (this.betConfig.partnerHasJeu ?? false);
  }

  const context: JeuTieContextBase = {
    partnerHasJeu: partnerHas,
    partnerFixed,
    partnerIsDecisive,
    sharedTiePossible,
    advCount
  };

  const formType = this.determineTieFormType(context);
  const formConfig =  this.getTieFormConfig(formType);

  return {
    ...context,
    formType,
    formConfig
  };
}

private buildFauxJeuTieContext(): JeuTieContext {
  const stats = this.lastFauxJeuResult!;
  const partnerFixed = this.partnerFixed;
  const advCount: 2 = 2;
  const myFauxJeu = this.getMyJeuValue();
  let partnerFauxJeu = -1;
  if (partnerFixed) {
    partnerFauxJeu = this.getPartnerJeuValue();
  }

  let partnerIsDecisive = false;
  const partnerHasJeu = partnerFixed;
  let formType: TieFormType;

  // =========================
  // 🔴 PARTENAIRE FIXÉ
  // =========================

  if (partnerFixed) {
    // partenaire meilleur
    if (partnerFauxJeu > myFauxJeu) {
      partnerIsDecisive = true;
      formType = TieFormType.FORM2B;

    // moi meilleur
    } else if (myFauxJeu > partnerFauxJeu) {
      partnerIsDecisive = false;
      formType = TieFormType.FORM2;

    // égalité interne
    } else {
      partnerIsDecisive = true;
      formType = TieFormType.FORM3;
    }

  // =========================
  // 🔴 PARTENAIRE NON FIXÉ
  // =========================

  } else {
    const mePct = stats.me_pct ?? 0;
    const partnerPct = stats.partner_pct ?? 0;

    if (mePct > partnerPct) {
      partnerIsDecisive = false;
      formType = TieFormType.FORM2;
    } else if (partnerPct > mePct) {
      partnerIsDecisive = true;
      formType = TieFormType.FORM2B;
    } else {
      partnerIsDecisive = true;
      formType = TieFormType.FORM3;
    }
  }

  const formConfig = this.getTieFormConfig(formType);

  return {
    advCount,

    partnerHasJeu,
    partnerFixed,
    partnerIsDecisive,

    sharedTiePossible: true,

    formType,
    formConfig
  };
}

private determineTieFormType(context: JeuTieContextBase): TieFormType {

  // 🔴 égalité interne réelle
  if (context.sharedTiePossible) {
    return TieFormType.FORM3;
  }

  // 🔴 partenaire décisif
  if (context.partnerIsDecisive) {
    return context.advCount === 1
      ? TieFormType.FORM1B
      : TieFormType.FORM2B;
  }

  // 🔴 joueur décisif = moi
  return context.advCount === 1
    ? TieFormType.FORM1
    : TieFormType.FORM2;
}

private getTieFormConfig(formType: TieFormType): TieFormConfig {
  switch (formType) {
    case TieFormType.FORM1:
      return {
        intro1: "Statistiquement, vos cartes sont meilleures que celles de votre partenaire.",
        intro2: "Vos cartes sont meilleures que celles de votre partenaire.",
        question: "Êtes-vous esku sur l’adversaire ?",

        showEsku: true,
        showMilieu: false,
        showSaku: true,

        alphaMap: {
          esku: 1,
          saku: 0
        }
      };

    case TieFormType.FORM1B:
      return {
        intro1: "Statistiquement, les cartes de votre partenaire sont meilleures que les vôtres.",
        intro2: "Les cartes de votre partenaire sont meilleures que les vôtres.",
        question: "Votre partenaire est-il esku sur l’adversaire ?",

        showEsku: true,
        showMilieu: false,
        showSaku: true,

        alphaMap: {
          esku: 1,
          saku: 0
        }
      };

    case TieFormType.FORM2:
      return {
        intro1: "Statistiquement, vos cartes sont meilleures que celles de votre partenaire.",
        intro2: "Vos cartes sont meilleures que celles de votre partenaire.",
        question: "Êtes-vous esku ?",

        showEsku: true,
        showMilieu: true,
        showSaku: true,

        alphaMap: {
          esku: 1,
          milieu: 0.5,
          saku: 0
        }
      };

    case TieFormType.FORM2B:
      return {
        intro1: "Statistiquement, les cartes de votre partenaire sont meilleures que les vôtres.",
        intro2: "Les cartes de votre partenaire sont meilleures que les vôtres.",
        question: "Votre partenaire est-il esku ?",

        showEsku: true,
        showMilieu: true,
        showSaku: true,

        alphaMap: {
          esku: 1,
          milieu: 0.5,
          saku: 0
        }
      };

    case TieFormType.FORM2C:
      return {
        intro1: "",
        intro2: "",
        question: "L’adversaire est-il esku ?",

        showEsku: true,
        showMilieu: true,
        showSaku: true,

        alphaMap: {
          esku: 0,
          milieu: 0.5,
          saku: 1
        }
      };

      case TieFormType.FORM3:
        return {
          intro1: "",
          intro2: "",
          question: "Vous et votre partenaire êtes à égalité, l'un d'entre vous est-il esku ?",

          showEsku: true,
          showMilieu: false,
          showSaku: true,

          alphaMap: {
            esku: 1,
            saku: 0.5
          }
        };

        default:
          return {
            intro1:"",
            intro2:"",
            question: "",
            showEsku: true,
            showMilieu: true,
            showSaku: true,

            alphaMap: {
              esku: 1,
              milieu: 0.5,
              saku: 0
            }
          };
  }
}

private strategyToAlpha(strategy: TieStrategy): number {
  switch(strategy) {
    case TieStrategy.ESKU:
      return 1;
    case TieStrategy.SAKU:
      return 0;
    default:
      return 0.5;
  }
}

tieContext: JeuTieContext | null = {
  advCount: 1,
  partnerHasJeu: false,
  partnerFixed: false,
  partnerIsDecisive: false,
  sharedTiePossible: false,
  formType: TieFormType.FORM1,
  formConfig: this.getTieFormConfig(TieFormType.FORM1)
};

}
