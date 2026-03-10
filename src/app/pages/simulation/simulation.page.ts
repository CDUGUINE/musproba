import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalController, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonText, IonGrid, IonRow, IonCol, IonHeader, IonTitle, IonButton, IonAccordionGroup, IonItem, IonAccordion, IonLabel, IonButtons, IonPopover, IonCheckbox, IonToolbar } from '@ionic/angular/standalone';
import { ApiService } from '../../core/http/api.service';
import { Simul1Response, BlockKey, OutcomeStats, MusResponse, SimCondBetDoubleRequest } from '../../shared/models/simulation.models';
import { Router } from '@angular/router';
import type { AdvKey, CondAdv } from '../../shared/models/simulation.models';
import { PopoverController } from '@ionic/angular';
import { MenuPopoverComponent } from '../../shared/menu-popover.component';
import { inject } from '@angular/core';
import { EsperanceModalComponent } from '../../esperance-modal/esperance-modal.component';


@Component({
  standalone: true,
  selector: 'app-simulation',
  imports: [
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
openEsperance(type: BlockKey) {

  const p = this.getProbability(type);

  this.modalCtrl.create({
    component: EsperanceModalComponent,
    componentProps: {
      type: type,
      p: p,
      conditional: this.conditionalMode[type]
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
      next: (r: any) => { this.fauxJeuEstimateText = (r?.display ?? '').toString(); },
      error: (err: any) => { console.error(err); this.fauxJeuEstimateText = 'Erreur API'; }
    });
    return;
  }

  const body = {
    hand_j1: base.hand_j1,
    hand_j3: base.hand_j3,
    bet: 'jeu' as const,
    iterations_adv1: this.jeuAdvDone.adv1 ? 1 : (this.n1Simul ?? 60000),
    iterations_adv2: this.jeuAdvDone.adv2 ? 1 : (this.n2Simul ?? 200000),
  };

  this.jeuEstimateText = 'Calculs en cours…';

  this.api.simulateCondBetDouble(body).subscribe({
    next: (r: any) => {
      this.addToJeuAcc('adv1', r?.results?.adv1);
      this.addToJeuAcc('adv2', r?.results?.adv2);
      this.jeuEstimateText = this.rebuildJeuDisplayDouble();
    },
    error: (err: any) => {
      console.error(err);
      this.jeuEstimateText = 'Erreur API';
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

pairesEstimateText = '';  // ce que renvoie simulate_cond_bet_double pour bet=paires
jeuEstimateText = '';     // texte cumulé du jeu (display reconstruit)
fauxJeuEstimateText = ''; // display de simulate_faux_jeu (si tu l’affiches plus tard)

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

  conditionalMode: Record<BlockKey, boolean> = {
    grand: false,
    petit: false,
    paires: false,
    jeu: false
  };
  
  // conditionalMode = false;
  // canUseConditional = false;

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
  this.jeuAcc = {
    adv1: { adv: 1, iterations: 0, matched_trials: 0, me: 0, partner: 0, tie: 0, lose: 0 },
    adv2: { adv: 2, iterations: 0, matched_trials: 0, me: 0, partner: 0, tie: 0, lose: 0 },
  };
  this.jeuAdvDone = { adv1: false, adv2: false };

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
    this.result = r;              // ou this.simResult = r, selon ce que ton HTML utilise
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

private teamHasPaires(r: any): boolean {
  return (r?.paires_j1 ?? 0) > 0 || (this.partnerFixed && (r?.paires_j3 ?? 0) > 0);
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

getProbability(type: BlockKey): number {

  const stats = this.getStats(type)!;

  if (!this.conditionalMode[type]) {

    return (
      stats.me_pct +
      stats.partner_pct +
      stats.tie_pct * 0.5
    ) / 100;

  }

  return (
    (stats.cond_me_pct ?? 0) +
    (stats.cond_tie_pct ?? 0) * 0.5
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

canUseConditional(type: BlockKey): boolean {

  const stats = this.getStats(type);
  if (!stats) return false;

  const pMe = stats.me_pct / 100;

  return (
    !this.partnerFixed &&
    pMe > 0.20 &&
    (type === 'grand' || type === 'petit')
  );

}

// getConditionalProbability(type: BlockKey): number {

//   let total = 0;
//   let win = 0;
//   let tie = 0;

//   for (const sim of this.simulations) {

//     if (sim.partnerValue <= sim.meValue) {

//       total++;

//       if (sim.result === 'win') win++;
//       if (sim.result === 'tie') tie++;

//     }

//   }

//   if (total === 0) return 0;

//   return (win + 0.5 * tie) / total;
// }

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

tapKey(v: number) {
  if (this.inputTarget === 'j3') {
    if (this.j3Values.length >= 4) return;

    this.j3Values.push(v);
    this.refreshJ3Cards();

    // optionnel : masquer clavier après 4
    if (this.j3Values.length === 4) {
      this.inputMode = 'none';
    }
    return;
  }

  // J1
  if (this.selectedValues.length >= 4) return;

  this.selectedValues.push(v);
  this.patchHandToForm(this.selectedValues);   // CLÉ
  this.refreshHandJ1Cards();

  // masquer clavier après la 4e carte
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
    return [Number(v.j1_0), Number(v.j1_1), Number(v.j1_2), Number(v.j1_3)]
      .map(x => Math.min(10, Math.max(1, Math.round(x))));
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

private addToJeuAcc(key: AdvKey, advRes: any) {
  if (!advRes) return;

  const acc = this.jeuAcc[key];
  acc.iterations += Number(advRes.iterations ?? 0);
  acc.matched_trials += Number(advRes.matched_trials ?? 0);
  acc.me += Number(advRes.me ?? 0);
  acc.partner += Number(advRes.partner ?? 0);
  acc.tie += Number(advRes.tie ?? 0);
  acc.lose += Number(advRes.lose ?? 0);

  if (acc.matched_trials >= this.JEU_THRESHOLD) this.jeuAdvDone[key] = true;
}

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
  const l1 = this.buildJeuLine(this.jeuAcc.adv1) + (this.jeuAdvDone.adv1 ? ' 🎌' : '');
  const l2 = this.buildJeuLine(this.jeuAcc.adv2) + (this.jeuAdvDone.adv2 ? ' 🎌' : '');
  return `${l1}\n${l2}`;
}

// PAIRES
pairesDisplayDouble = '';

// JEU
jeuDisplayDouble = '';
jeuDisplayFaux = '';

private jeuAcc: Record<AdvKey, CondAdv> = {
  adv1: { adv: 1, iterations: 0, matched_trials: 0, me: 0, partner: 0, tie: 0, lose: 0 },
  adv2: { adv: 2, iterations: 0, matched_trials: 0, me: 0, partner: 0, tie: 0, lose: 0 },
};

private readonly JEU_THRESHOLD = 10000;
private jeuAdvDone: Record<AdvKey, boolean> = { adv1: false, adv2: false };

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

}
