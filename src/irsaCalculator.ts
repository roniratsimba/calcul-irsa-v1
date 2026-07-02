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
  seuilExoneration: 350000, // Seuil d'exonération complète
  plafondCotisations: 2400000 // Plafond pour les cotisations (2 400 000 Ar)
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
 * Calcule les cotisations CNaPS et Sanitaire avec plafond
 * @param salaireBrut - Salaire brut en Ariary
 * @param avecSanitaire - Si la cotisation sanitaire est applicable
 * @returns Objet avec les montants de cotisations
 */
export function calculerCotisations(
  salaireBrut: number,
  avecSanitaire: boolean
): { cnaps: number; sanitaire: number } {
  // Plafond pour les cotisations : 2 400 000 Ar
  const salairePlafonne = Math.min(salaireBrut, BAREME_IRSA_MADAGASCAR.plafondCotisations);
  
  const cnaps = salairePlafonne * 0.01; // 1%
  const sanitaire = avecSanitaire ? salairePlafonne * 0.01 : 0; // 1% si applicable
  
  return { cnaps, sanitaire };
}

/**
 * Calcule l'IRSA Madagascar selon le barème officiel Loi de Finances 2026
 * @param salaireBrut - Salaire brut en Ariary
 * @param cnaps - Cotisation CNaPS
 * @param sanitaire - Cotisation sanitaire/OSTIE
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

  // Arrondi légal à la centaine d'Ariary inférieure (art. 01.03.10 du CGI malgache)
  // Ex: 3 957 972 Ar devient 3 957 900 Ar
  const baseImposable = Math.floor(baseImposableBruteCalc / 100) * 100;

  // Calcul de l'IRSA brut par tranches progressives
  let irsaBrut = 0;
  const detailTranches: IRSAResultat['detailTranches'] = [];

  for (const tranche of BAREME_IRSA_MADAGASCAR.tranches) {
    // Calculer la portion du revenu qui tombe dans cette tranche
    const trancheMin = tranche.min;
    const trancheMax = tranche.max === Infinity ? baseImposable : tranche.max;
    
    // Si le revenu est inférieur au minimum de la tranche, passer à la suivante
    if (baseImposable <= trancheMin) {
      detailTranches.push({
        label: tranche.label,
        min: tranche.min,
        max: tranche.max === Infinity ? null : tranche.max,
        taux: tranche.taux,
        imposable: 0,
        impot: 0
      });
      continue;
    }
    
    // Calculer le montant imposable dans cette tranche
    const montantImposable = Math.min(baseImposable, trancheMax) - trancheMin;
    const impotTranche = montantImposable * tranche.taux;

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

/**
 * Calcule le salaire brut à partir du salaire net (calcul inverse)
 * Utilise une méthode itérative pour trouver le salaire brut qui correspond au salaire net souhaité
 * @param salaireNetCible - Salaire net souhaité en Ariary
 * @param avecSanitaire - Si la cotisation sanitaire est applicable
 * @param nombreEnfants - Nombre d'enfants à charge
 * @returns Résultat du calcul avec le salaire brut trouvé
 */
export function calculerDepuisNet(
  salaireNetCible: number,
  avecSanitaire: boolean,
  nombreEnfants: number = 0
): IRSAResultat {
  // Recherche par dichotomie pour trouver le salaire brut
  let min = salaireNetCible;
  let max = salaireNetCible * 2; // Le brut ne peut pas être plus du double du net
  let iterations = 0;
  const maxIterations = 100;
  const tolerance = 100; // Tolérance de 100 Ar

  let resultat: IRSAResultat | null = null;

  while (iterations < maxIterations && max - min > tolerance) {
    const milieu = (min + max) / 2;
    const cotisations = calculerCotisations(milieu, avecSanitaire);
    const calc = calculerIRSA(milieu, cotisations.cnaps, cotisations.sanitaire, nombreEnfants);

    if (calc.salaireNet < salaireNetCible) {
      min = milieu;
    } else {
      max = milieu;
      resultat = calc;
    }

    iterations++;
  }

  // Si on n'a pas trouvé de résultat, retourner une estimation
  if (!resultat) {
    const cotisations = calculerCotisations(max, avecSanitaire);
    resultat = calculerIRSA(max, cotisations.cnaps, cotisations.sanitaire, nombreEnfants);
  }

  return resultat;
}
