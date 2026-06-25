import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs: FaqItem[] = [
    {
      question: "Mon 13ème mois est-il imposable à l'IRSA ?",
      answer: "Oui, le 13ème mois est imposable à l'IRSA de la même manière qu'un mois de salaire ordinaire. Il s'ajoute à la base imposable du mois de son versement et fait l'objet d'un calcul séparé ou d'un cumul, selon les pratiques de paie de l'entreprise, mais il reste pleinement soumis au barème progressif."
    },
    {
      question: "Comment sont taxées les heures supplémentaires ?",
      answer: "Les heures supplémentaires sont exonérées d'IRSA dans la limite légale de 20 heures par mois (Loi de finances). Le montant correspondant à ces heures supplémentaires exonérées est déduit du salaire brut imposable avant le calcul des tranches de l'impôt."
    },
    {
      question: "Qu'est-ce que le minimum de perception de 3 000 Ar ?",
      answer: "L'article 01.03.14 du Code Général des Impôts (CGI) stipule que l'IRSA à payer ne peut jamais être inférieur à un plancher légal fixé à 3 000 Ar par mois. Même si vos charges de famille (personnes à charge) réduisent votre impôt théorique en dessous de ce montant ou à zéro, vous devez tout de même payer cette perception minimale de 3 000 Ar."
    },
    {
      question: "Comment déclarer une personne à charge pour bénéficier de la réduction ?",
      answer: "Chaque personne à charge déclarée (enfants mineurs, conjoint sans revenus) donne droit à une réduction d'impôt directe de 2 000 Ar par mois. Pour en bénéficier, le salarié doit fournir à son employeur des pièces justificatives (actes de naissance, certificat de célibat, etc.) qui les transmettra à l'administration fiscale."
    },
    {
      question: "L'indemnité de transport est-elle imposable ?",
      answer: "L'indemnité de transport est exonérée d'IRSA uniquement s'il s'agit du remboursement de frais réels professionnels justifiés, ou si elle reste dans les limites de l'indemnité légale de transport collectif organisée par l'employeur. Les primes de transport forfaitaires injustifiées intégrées directement au salaire sont imposables."
    },
    {
      question: "Quel est le taux de cotisation CNaPS pour le salarié ?",
      answer: "Le taux de cotisation salariale à la CNaPS est de 1% du salaire brut. Cette cotisation est plafonnée mensuellement à 8 fois le Salaire Minimum d'Embauche (SME). Pour 2026, avec un SME de 262 680 Ar, la cotisation maximale du salarié est de 21 014 Ar par mois."
    },
    {
      question: "Qu'est-ce que l'OSTIE et quel est son taux de cotisation ?",
      answer: "L'OSTIE est une organisation sanitaire interentreprises assurant la couverture médicale des salariés. La cotisation salariale est généralement de 1% du salaire brut, plafonnée également à 8 fois le SME. Elle est retenue à la source par l'employeur, puis déduite du brut pour déterminer l'assiette imposable à l'IRSA."
    },
    {
      question: "Comment est calculé l'IRSA si j'ai plusieurs employeurs ?",
      answer: "Si vous cumulez plusieurs emplois, chaque employeur effectue la retenue à la source sur le salaire qu'il vous verse. Toutefois, vous êtes tenu de faire une déclaration globale annuelle d'impôts auprès de la DGI en cumulant tous vos revenus salariaux afin de régulariser l'IRSA selon les tranches de l'assiette totale consolidée."
    },
    {
      question: "À quel moment l'employeur doit-il verser l'IRSA retenu à la source ?",
      answer: "L'employeur effectue la retenue sur le salaire de chaque employé lors du paiement. Il a l'obligation légale de déclarer et de reverser l'ensemble de ces impôts retenus auprès de la DGI au plus tard le 15 du mois qui suit le versement des salaires."
    },
    {
      question: "Quelles sont les sanctions en cas de retard de déclaration ou de paiement ?",
      answer: "En cas de retard de dépôt de déclaration de l'IRSA par l'employeur, une pénalité forfaitaire est applicable. De plus, tout retard de paiement des impôts retenus à la source entraîne une majoration de retard de 10% sur les sommes dues, augmentée d'un intérêt de retard de 1% par mois de retard supplémentaire."
    }
  ];

  return (
    <div className="w-full flex flex-col gap-3">
      {faqs.map((faq, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div
            key={idx}
            className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] overflow-hidden transition-all hover:border-purple-500/30"
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : idx)}
              className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left font-display font-medium text-sm md:text-base text-[var(--color-text-primary)] focus:outline-none focus:text-[var(--color-accent-violet)]"
            >
              <span>{faq.question}</span>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-[var(--color-text-secondary)]"
              >
                <ChevronDown className="w-5 h-5" />
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                >
                  <div className="px-5 pb-5 pt-1 text-sm text-[var(--color-text-secondary)] border-t border-zinc-800/40 leading-relaxed">
                    {faq.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
