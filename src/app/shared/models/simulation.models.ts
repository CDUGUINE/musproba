export type OutcomeKey = 'me' | 'partner' | 'tie' | 'lose';
export type BlockKey = 'grand' | 'petit' | 'paires' | 'jeu';
export type BetKey = 'paires' | 'jeu';

export interface OutcomeStats {
  me: number;
  partner: number;
  tie: number;
  lose: number;
  me_pct: number;
  partner_pct: number;
  tie_pct: number;
  lose_pct: number;

  // nouveaux champs (calcul conditionnel)
  cond_total: number;
  cond_me_pct: number;
  cond_tie_pct: number;
  cond_lose_pct: number;
}

export interface AdvStatsBlock {
  adv0: number;
  adv1: number;
  adv2: number;
  adv0_pct: number;
  adv1_pct: number;
  adv2_pct: number;
}

export interface Simul1Request {
  hand_j1: [number, number, number, number];
  hand_j3?: [number, number, number, number] | null; // optionnel
  seed: number;
  iterations: number;
}

export interface Simul1Response {
  iterations: number;
  duration_ms: number;

  results: Record<BlockKey, OutcomeStats>;

  display?: string;

  adv_stats?: Partial<Record<'paires' | 'jeu', AdvStatsBlock>>;

  display_paires_me?: string;
  display_paires_partner?: string;
  display_paires_none?: string;

  display_jeu_me?: string;
  display_jeu_partner?: string;
  display_jeu_none?: string;

  paires_j1?: number;
  jeu_j1?: number;
  paires_j3?: number;
  jeu_j3?: number;

  partenaire_fixe?: boolean;

  [key: string]: unknown;
}

export interface MusRequest {
  iterations: number;
  hand_j1: [number, number, number, number];
  keep_mask: [boolean, boolean, boolean, boolean];
  seed: number;
}

export interface MusResponse {
  iterations: number;
  duration_ms: number;
  paires_pct?: number;
  meds_pct?: number;
  doubles_pct?: number;
  jeu_pct?: number;
  '31_pct'?: number;
  display?: string;
  [key: string]: unknown;
}

export interface SimCondBetDoubleRequest {
  hand_j1: [number, number, number, number];
  hand_j3?: [number, number, number, number] | null;
  bet: BetKey;
  iterations_adv1: number; // 30000 ou n1Simul
  iterations_adv2: number; // 80000 ou n2Simul
}

export interface SimCondBetDoubleResponse {
  duration_ms: number;
  bet: 'paires' | 'jeu';
  results: { adv1: unknown; adv2: unknown };
  display_double: string;
}

export interface SimFauxJeuRequest {
  iterations: number; // 80000
  hand_j1: [number, number, number, number];
  hand_j3?: [number, number, number, number] | null;
}

export type SimFauxJeuResponse = Simul1Response;

export type AdvKey = 'adv1' | 'adv2';

export interface CondAdv {
  adv: number;              // 1 ou 2
  iterations: number;
  matched_trials: number;
  me: number;
  partner: number;
  tie: number;
  lose: number;
}
