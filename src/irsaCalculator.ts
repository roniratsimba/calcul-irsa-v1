// Barème officiel IRSA Madagascar - Loi de Finances 2026
export const BAREME_IRSA_MADAGASCAR = {
  tranches: [
    { min: 0, max: 350000, taux: 0.00, label: 'Exonéré' },
    { min: 350001, max: 400000, taux: 0.05, label: '5%' },
    { min: 400001, max: 500000, taux: 0.10, label: '10%' },
    { min: 500001, max: 600000, taux: 0.15, label: '15%' },
    { min: 600001, max: 4000000, taux: 0.20, label: '20%' },
    { min: 4000001, max: Infinity, taux: 0.25, label: '25%' }
  ],
  minimumPerception: 3000, // 3 000 Ar minimum (Loi 2026)
  reductionCharge: 2000, // 2 000 Ar par enfant à charge
  seuilExoneration: 350000 // Seuil d'exonération complète
};

export interface IRSAResultat {
  salaireBrut: number;
  cnaps: number;
  sanitaire: number;
  baseImposable: number;
  irsaBrut: number;
  reductionEnfants: number;
  irsaNet: number;
  salaireNet: number;
  detailTranches: Array<{
    label: string;
    min: number;
    max: number | null;
    taux: number;
    imposable: number;
    impot: number;
  }>;
}

/**
 * Calcule l'IRSA Madagascar selon le barème officiel Loi de Finances 2026
 * @param salaireBrut - Salaire brut en Ariary
 * @param cnaps - Cotisation CNaPS (1% du salaire brut)
 * @param sanitaire - Cotisation sanitaire/OSTIE (1% du salaire brut)
 * @param nombreEnfants - Nombre d'enfants à charge
 */
export function calculerIRSA(
  salaireBrut: number,
  cnaps: number,
  sanitaire: number,
  nombreEnfants: number = 0
): IRSAResultat {
  // Calcul de la base imposable brute
  const baseImposableBrute = salaireBrut - cnaps - sanitaire;
  const baseImposableBruteCalc = Math.max(0, baseImposableBrute);

  // Arrondi légal à la centaine d'Ariary inférieure
  // Ex: 450 175 Ar devient 450 100 Ar
  const baseImposable = Math.floor(baseImposableBruteCalc / 100) * 100;

  // Calcul de l'IRSA brut par tranches progressives
  let irsaBrut = 0;
  const detailTranches: IRSAResultat['detailTranches'] = [];

  for (const tranche of BAREME_IRSA_MADAGASCAR.tranches) {
    if (baseImposable <= tranche.min) break;

    const maxTranche = tranche.max === Infinity ? baseImposable : Math.min(baseImposable, tranche.max);
    const montantImposable = maxTranche - tranche.min;
    const impotTranche = Math.round(montantImposable * tranche.taux);

    irsaBrut += impotTranche;

    detailTranches.push({
      label: tranche.label,
      min: tranche.min,
      max: tranche.max === Infinity ? null : tranche.max,
      taux: tranche.taux,
      imposable: montantImposable,
      impot: impotTranche
    });
  }

  // Réduction pour charges de famille
  const reductionEnfants = nombreEnfants * BAREME_IRSA_MADAGASCAR.reductionCharge;
  let irsaNet = irsaBrut - reductionEnfants;

  // Application du minimum de perception selon la Loi 2026
  // Si le salaire imposable est strictement inférieur ou égal au seuil d'exonération (350 000 Ar), l'impôt est de 0 Ar
  if (baseImposable <= BAREME_IRSA_MADAGASCAR.seuilExoneration) {
    irsaNet = 0;
  } else {
    // Sinon, l'impôt calculé ne peut jamais être inférieur à 3 000 Ar
    if (irsaNet < BAREME_IRSA_MADAGASCAR.minimumPerception) {
      irsaNet = BAREME_IRSA_MADAGASCAR.minimumPerception;
    }
  }

  // Salaire net
  const salaireNet = salaireBrut - cnaps - sanitaire - irsaNet;

  return {
    salaireBrut,
    cnaps,
    sanitaire,
    baseImposable,
    irsaBrut,
    reductionEnfants,
    irsaNet,
    salaireNet,
    detailTranches
  };
}
