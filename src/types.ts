export enum TypeCalcul {
  BRUT_VERS_NET = 'BRUT_VERS_NET',
  NET_VERS_BRUT = 'NET_VERS_BRUT',
  SIMULATION_ANNUELLE = 'SIMULATION_ANNUELLE',
  COMPARAISON = 'COMPARAISON'
}

export interface Tranche {
  min: number;
  max: number;
  taux: number;
  label: string;
}

export interface BaremeIRSA {
  id: number;
  annee: number;
  tranches: Tranche[];
  sme: number;
  plafondCnaps: number;
  plafondOstie: number;
  multiplPlaf: number;
  reductionCharge: number;
  minimumPerception: number;
  actif: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TrancheDetailResult {
  label: string;
  taux: number;
  min: number;
  max: number | null;
  imposable: number;
  impot: number;
}

export interface CalculIRSAResult {
  salaireBrut: number;
  cnaps: number;
  ostie: number;
  baseImposable: number;
  irsaBrut: number;
  reductionCharge: number;
  irsaFinal: number;
  salaireNet: number;
  tauxEffectif: number;
  detailTranches: TrancheDetailResult[];
  personnesCharge: number;
  heuresSup?: number;
  montantHeuresSupExonerees?: number;
  anneeBareme: number;
}

export interface SimulationAnnuelleResult {
  mensuel: CalculIRSAResult;
  annuel: {
    salaireBrut: number;
    cnaps: number;
    ostie: number;
    irsaTotal: number;
    salaireNet: number;
  };
  avec13eme: boolean;
  detail13eme: CalculIRSAResult | null;
}

export interface ComparaisonResult {
  salaire1: CalculIRSAResult;
  salaire2: CalculIRSAResult;
  differences: {
    salaireBrut: number;
    irsa: number;
    salaireNet: number;
    tauxEffectif: number;
  };
}

export interface CalculIRSADbRecord {
  id: string;
  sessionId: string;
  typeCalcul: TypeCalcul;
  salaireBrut: number | null;
  salaireNet: number | null;
  personnesCharge: number;
  heuresSup: number;
  cnaps: number;
  ostie: number;
  baseImposable: number;
  irsaCalcule: number;
  salaireNetFinal: number;
  detailTranches: TrancheDetailResult[];
  tauxEffectif: number;
  anneeBareme: number;
  createdAt: string;
}

export interface StatsAgregees {
  totalCalculs: number;
  salaireMoyen: number;
  irsaMoyen: number;
  tauxEffectifMoyen: number;
  repartitionTranches: {
    t0: number; // 0%
    t5: number; // 5%
    t10: number; // 10%
    t15: number; // 15%
    t20: number; // 20%
    t25: number; // 25%
  };
}

export interface AnomalieRecord {
  id?: string;
  nom?: string;
  email?: string;
  typeAnomalie: string;
  description: string;
  detailsCalcul?: string;
  createdAt?: string;
}

