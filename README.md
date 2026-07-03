# Calculateur IRSA Madagascar 2026

Application web locale pour le calcul de l'Impôt sur le Revenu Salarial et Assimilés (IRSA) à Madagascar, conforme à la Loi de Finances 2026.

## 📋 Description

Le Calculateur IRSA Madagascar est une application 100% locale qui permet de calculer rapidement et précisément l'IRSA selon le barème fiscal officiel de Madagascar pour l'année 2026. Aucune API externe ou connexion internet n'est requise pour le calcul.


## 📊 Barème Fiscal 2026

L'IRSA est calculé selon un barème progressif par tranches

## Installation et lancement 

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

## 📄 Licence

Ce projet est mis à disposition pour usage personnel et éducatif.

---

*Conforme à la Loi de Finances 2026 de Madagascar*
