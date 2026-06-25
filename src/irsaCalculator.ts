import { BaremeIRSA, CalculIRSAResult, SimulationAnnuelleResult, ComparaisonResult, TrancheDetailResult, TypeCalcul } from './types';

// Default 2026 Barème as fallback if none is provided or loaded
export const BAREME_2026_DEFAULT: BaremeIRSA = {
  id: 1,
  annee: 2026,
  sme: 262680, // Salaire Minimum d'Embauche 2026
  plafondCnaps: 0.01, // 1%
  plafondOstie: 0.01, // 1%
  multiplPlaf: 8, // 8x SME
  reductionCharge: 2000, // 2000 Ar per person
  minimumPerception: 3000, // 3000 Ar floor
  actif: true,
  tranches: [
    { min: 0, max: 350000, taux: 0.00, label: 'Exonéré' },
    { min: 350000, max: 400000, taux: 0.05, label: '5%' },
    { min: 400000, max: 500000, taux: 0.10, label: '10%' },
    { min: 500000, max: 600000, taux: 0.15, label: '15%' },
    { min: 600000, max: 4000000, taux: 0.20, label: '20%' },
    { min: 4000000, max: 999999999, taux: 0.25, label: '25%' }
  ]
};

/**
 * Calcule l'IRSA à partir d'un salaire brut
 */
export function calculerDepuisBrut(
  salaireBrut: number,
  personnesCharge: number = 0,
  heuresSup: number = 0,
  bareme: BaremeIRSA = BAREME_2026_DEFAULT
): CalculIRSAResult {
  const plafondCotisation = bareme.sme * bareme.multiplPlaf;

  // 1. Cotisations salariales (plafonnées à 8x SME)
  const baseCotsalaire = Math.min(salaireBrut, plafondCotisation);
  const cnaps = Math.round(baseCotsalaire * bareme.plafondCnaps);
  const ostie = Math.round(baseCotsalaire * bareme.plafondOstie);

  // Heures supplémentaires exonérées (max 20h)
  // Calcul de la valeur des heures supplémentaires exonérées à déduire de l'assiette imposable.
  // Base de 173.33 heures mensuelles légales à Madagascar avec majoration de 30% (1.3)
  const tauxHoraire = salaireBrut / 173.33;
  const heuresSupMax = Math.min(heuresSup, 20);
  const montantHeuresSupExonerees = Math.round(heuresSupMax * tauxHoraire * 1.3);

  // 2. Base imposable IRSA (arrondie à la centaine inférieure, après cotisations et heures sup exonérées)
  let baseImposableRaw = salaireBrut - cnaps - ostie - montantHeuresSupExonerees;
  if (baseImposableRaw < 0) baseImposableRaw = 0;
  
  const baseImposable = Math.floor(baseImposableRaw / 100) * 100;

  // 3. Calcul par tranches progressives
  const detailTranches: TrancheDetailResult[] = [];
  let irsaBrut = 0;

  for (let i = 0; i < bareme.tranches.length; i++) {
    const t = bareme.tranches[i];
    if (baseImposable <= t.min) break;

    const maxTranche = t.max === 999999999 ? baseImposable : Math.min(baseImposable, t.max);
    const montantImposable = maxTranche - t.min;
    const impotTranche = Math.round(montantImposable * t.taux);

    irsaBrut += impotTranche;
    detailTranches.push({
      label: t.label,
      taux: t.taux,
      min: t.min,
      max: t.max === 999999999 ? null : t.max,
      imposable: montantImposable,
      impot: impotTranche
    });
  }

  // 4. Réduction personnes à charge
  const reductionCharge = personnesCharge * bareme.reductionCharge;
  let irsaNet = irsaBrut - reductionCharge;

  // 5. Plancher légal
  const irsaFinal = Math.max(bareme.minimumPerception, irsaNet);

  // 6. Salaire net
  const salaireNet = salaireBrut - cnaps - ostie - irsaFinal;

  // 7. Taux effectif
  const tauxEffectif = salaireBrut > 0 ? (irsaFinal / salaireBrut) * 100 : 0;

  return {
    salaireBrut,
    cnaps,
    ostie,
    baseImposable,
    irsaBrut,
    reductionCharge,
    irsaFinal,
    salaireNet,
    tauxEffectif: parseFloat(tauxEffectif.toFixed(2)),
    detailTranches,
    personnesCharge,
    heuresSup: heuresSupMax,
    montantHeuresSupExonerees,
    anneeBareme: bareme.annee
  };
}

/**
 * Calcul INVERSE : retrouver le brut à partir du net souhaité (dichotomie / binary search)
 */
export function calculerDepuisNet(
  salaireNetCible: number,
  personnesCharge: number = 0,
  bareme: BaremeIRSA = BAREME_2026_DEFAULT
): CalculIRSAResult {
  if (salaireNetCible <= 0) {
    return calculerDepuisBrut(0, personnesCharge, 0, bareme);
  }

  let low = salaireNetCible;
  let high = salaireNetCible * 3.0; // Large bound
  let brut = 0;

  for (let iter = 0; iter < 100; iter++) {
    brut = Math.round((low + high) / 2);
    const res = calculerDepuisBrut(brut, personnesCharge, 0, bareme);
    const diff = res.salaireNet - salaireNetCible;

    if (Math.abs(diff) < 1) break; // Accurary of 1 Ariary
    if (diff < 0) {
      low = brut;
    } else {
      high = brut;
    }
  }

  return calculerDepuisBrut(brut, personnesCharge, 0, bareme);
}

/**
 * Simulation annuelle (12 mois + 13ème mois optionnel)
 */
export function simulerAnnuel(
  salaireBrutMensuel: number,
  personnesCharge: number = 0,
  avec13eme: boolean = true,
  bareme: BaremeIRSA = BAREME_2026_DEFAULT
): SimulationAnnuelleResult {
  const mensuel = calculerDepuisBrut(salaireBrutMensuel, personnesCharge, 0, bareme);
  const mois = 12;
  const total13eme = avec13eme ? calculerDepuisBrut(salaireBrutMensuel, personnesCharge, 0, bareme) : null;

  const irsaTotal = (mensuel.irsaFinal * mois) + (total13eme ? total13eme.irsaFinal : 0);
  const cnapsTotal = (mensuel.cnaps * mois) + (total13eme ? total13eme.cnaps : 0);
  const ostieTotal = (mensuel.ostie * mois) + (total13eme ? total13eme.ostie : 0);
  const brutTotal = (salaireBrutMensuel * mois) + (avec13eme ? salaireBrutMensuel : 0);
  const netTotal = (mensuel.salaireNet * mois) + (total13eme ? total13eme.salaireNet : 0);

  return {
    mensuel,
    annuel: {
      salaireBrut: brutTotal,
      cnaps: cnapsTotal,
      ostie: ostieTotal,
      irsaTotal: irsaTotal,
      salaireNet: netTotal
    },
    avec13eme,
    detail13eme: total13eme
  };
}

/**
 * Comparaison de 2 salaires
 */
export function comparerSalaires(
  brut1: number,
  brut2: number,
  personnesCharge: number = 0,
  bareme: BaremeIRSA = BAREME_2026_DEFAULT
): ComparaisonResult {
  const res1 = calculerDepuisBrut(brut1, personnesCharge, 0, bareme);
  const res2 = calculerDepuisBrut(brut2, personnesCharge, 0, bareme);

  return {
    salaire1: res1,
    salaire2: res2,
    differences: {
      salaireBrut: brut2 - brut1,
      irsa: res2.irsaFinal - res1.irsaFinal,
      salaireNet: res2.salaireNet - res1.salaireNet,
      tauxEffectif: parseFloat((res2.tauxEffectif - res1.tauxEffectif).toFixed(2))
    }
  };
}
