export type OutcomeKey = 'me' | 'partner' | 'tie' | 'lose';
export type BlockKey = 'grand' | 'petit' | 'paires' | 'jeu';
export type BetKey = 'paires' | 'jeu';
export type GameMode = 'start' | 'bet';
export type BetType = 'paires' | 'jeu';

export interface BetConfig {
  partnerHasPairs: boolean;
  partnerHasJeu: boolean;
  advHasPairs: 0 | 1 | 2 | null;
  advHasJeu: 0 | 1 | 2 | null;
  partnerLeqMe: boolean;
}

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

export interface SimFauxJeuFilteredResponse {
  iterations: number;

  matched_trials: number;
  matched_pct: number;

  duration_ms: number;

  me_pct: number;
  partner_pct: number;
  tie_pct: number;
  lose_pct: number;

  display: string;
}

export type AdvKey = 'adv1' | 'adv2';

export interface CondAdv {
  adv: number;              // 1 ou 2
  iterations: number;
  matched_trials: number;
  me: number;
  partner: number;
  tie: number;
  lose: number;
  team_points_sum: number;
  team_win_count: number;
  opp_lose_count: number;
  opp_all_count: number;
  opp_points_lose_sum: number;
  opp_points_all_sum: number;
}

export interface SimCondBetDoubleFilteredRequest {
  hand_j1: number[];
  hand_j3?: number[] | null;

  bet: BetType;

  partner_has_pairs?: boolean | null;
  partner_has_jeu?: boolean | null;
  no_better?: boolean;

  iterations_adv1: number;
  iterations_adv2: number;
}

export interface CondBetResult {
  adv: number;
  iterations: number;
  matched_trials: number;
  matched_pct: number;

  me: number;
  partner: number;
  tie: number;
  lose: number;

  me_pct: number;
  partner_pct: number;
  tie_pct: number;
  lose_pct: number;

  display: string;

  avg_team_points_win: number;
  avg_opp_points_lose: number;
  avg_opp_points_all: number;
}

export interface SimCondBetDoubleFilteredResponse {
  results: {
    adv1: CondBetResult;
    adv2: CondBetResult;
  };
}

export interface SimFauxJeuFilteredRequest {
  hand_j1: number[];
  hand_j3?: number[] | null;
  no_better?: boolean;
  iterations: number;
}

export enum TieStrategy {
  ESKU = 'ESKU',
  MILIEU = 'MILIEU',
  SAKU = 'SAKU'
}

export enum TieFormType {
  NONE = 'NONE',
  FORM1 = 'FORM1',
  FORM2 = 'FORM2',
  FORM3 = 'FORM3',
  FORM1B = 'FORM1B',
  FORM2B = "FORM2B",
  FORM2C = "FORM2C"
}

export interface JeuTieContext {
  // déterminé automatiquement
  partnerHasJeu: boolean;
  partnerFixed: boolean;
  partnerIsDecisive: boolean;

  // égalité possible entre j1 et j3
  sharedTiePossible: boolean;

  // formulaire à afficher
  formType: TieFormType;
  formConfig: TieFormConfig;
}

export interface TieResolutionAnswers {
  strategy?: TieStrategy;
  opponentSpeaksBefore?: boolean;
  opponentIsEsku?: boolean;
}

export interface TieDecision {
  alpha: number;
  resolvedStrategy: TieStrategy;
  requiresWarning?: boolean;
}

export interface JeuStats {
  avg_opp_points_all: number;
  avg_opp_points_lose: number;
  avg_team_points_win: number;
  me: number;
  partner: number;
  tie: number;
  lose: number;
  matched_trials: number;
}

export interface JeuEvStats {
  myPoints: number;
  avgTeamPointsWin: number;
  avgOppLose: number;
  avgOppAll: number;
}

export interface JeuTieContextBase {
  advCount: 1 | 2;
  partnerHasJeu: boolean;
  partnerFixed: boolean;
  partnerIsDecisive: boolean;
  sharedTiePossible: boolean;
}

export interface JeuTieContext
  extends JeuTieContextBase {
  formType: TieFormType;
}

export interface TieFormConfig {
  intro1: string;
  intro2: string;
  question: string;

  showEsku: boolean;
  showMilieu: boolean;
  showSaku: boolean;

  alphaMap: {
    esku?: number;
    milieu?: number;
    saku?: number;
  };
}