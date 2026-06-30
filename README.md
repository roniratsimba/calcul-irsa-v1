# Calculateur IRSA Madagascar 2026

Application web locale pour le calcul de l'Impôt sur le Revenu Salarial et Assimilés (IRSA) à Madagascar, conforme à la Loi de Finances 2026.

## 📋 Description

Le Calculateur IRSA Madagascar est une application 100% locale qui permet de calculer rapidement et précisément l'IRSA selon le barème fiscal officiel de Madagascar pour l'année 2026. Aucune API externe ou connexion internet n'est requise pour le calcul.

### ✨ Fonctionnalités

- **Calculateur IRSA** : Formulaire simple pour saisir le salaire brut et les charges de famille
- **Barème 2026** : Application automatique des nouvelles tranches d'imposition
- **Arrondi légal** : Arrondi automatique à la centaine d'Ariary inférieure
- **Guide complet** : Page d'information expliquant le fonctionnement de l'impôt
- **Formulaire de contact** : Système de feedback intégré via Formspree
- **Thème adaptatif** : Mode sombre/clair pour un confort visuel optimal

## 📊 Barème Fiscal 2026

L'IRSA est calculé selon un barème progressif par tranches :

| Tranche | Taux |
|---------|------|
| 0 à 350 000 Ar | 0% (Exonéré) |
| 350 001 à 400 000 Ar | 5% |
| 400 001 à 500 000 Ar | 10% |
| 500 001 à 600 000 Ar | 15% |
| 600 001 à 4 000 000 Ar | 20% |
| Au-delà de 4 000 000 Ar | 25% |

### Règles de calcul

- **Minimum de perception** : 3 000 Ar (sauf si exonéré)
- **Réduction charges de famille** : 2 000 Ar par enfant à charge
- **Arrondi légal** : Base imposable arrondie à la centaine inférieure
- **Cotisations déductibles** : CNaPS (1%) et OSTIE (1% si applicable)

## 🚀 Installation et Lancement

**Prérequis :** Node.js

1. Installer les dépendances :
   ```bash
   npm install
   ```

2. Lancer l'application :
   ```bash
   npm run dev
   ```

3. Ouvrir votre navigateur sur `http://localhost:5173`

## 🛠️ Technologies utilisées

- **React 19** : Framework JavaScript pour l'interface utilisateur
- **TypeScript** : Typage statique pour plus de fiabilité
- **Tailwind CSS** : Framework CSS pour le styling moderne
- **Vite** : Build tool rapide et optimisé
- **Lucide React** : Icônes modernes et légères

## 📝 Structure du projet

```
calcul-irsa-v1/
├── src/
│   ├── App.tsx              # Composant principal avec navigation
│   ├── irsaCalculator.ts    # Logique de calcul IRSA
│   └── main.tsx             # Point d'entrée React
├── public/                   # Assets statiques
├── package.json              # Dépendances du projet
└── vite.config.ts           # Configuration Vite
```

## 🎯 Caractéristiques techniques

- **100% local** : Aucune appel API externe pour les calculs
- **Sans dépendance IA** : Pas de Google Gemini, OpenAI ou autres services d'IA
- **Responsive** : Adapté mobile, tablette et desktop
- **Performance** : Calcul instantané sans latence
- **Sécurité** : Pas de stockage de données sensibles

## 👤 Auteur

**Roni Ratsimbazafy**
Étudiant en Informatique

## 📄 Licence

Ce projet est mis à disposition pour usage personnel et éducatif.

---

*Conforme à la Loi de Finances 2026 de Madagascar*
