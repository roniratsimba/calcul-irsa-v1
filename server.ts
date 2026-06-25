import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  calculerDepuisBrut,
  calculerDepuisNet,
  simulerAnnuel,
  comparerSalaires
} from './src/irsaCalculator';
import {
  initDb,
  getActiveBareme,
  saveBareme,
  saveCalcul,
  getCalculsBySession,
  deleteCalculsBySession,
  getStatsAgregees,
  saveAnomalie
} from './src/serverDb';
import { TypeCalcul } from './src/types';

// Initialize the file-based database
initDb();

const app = express();
const PORT = 3000;

// Enable JSON bodies
app.use(express.json());

// Helper for numeric validations
function validateNumber(val: any, name: string, min: number, max: number, entier: boolean, errors: string[]) {
  if (val === undefined || val === null) {
    return; // Optional fields are allowed if not sent
  }
  const num = Number(val);
  if (isNaN(num)) {
    errors.push(`Le champ '${name}' doit être un nombre.`);
    return;
  }
  if (num < min || num > max) {
    errors.push(`Le champ '${name}' doit être compris entre ${min} et ${max}.`);
  }
  if (entier && !Number.isInteger(num)) {
    errors.push(`Le champ '${name}' doit être un nombre entier.`);
  }
}

// Validation middleware for IRSA calculations
const validateIrsaInputs = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors: string[] = [];
  
  if (req.body.salaireBrut !== undefined) {
    validateNumber(req.body.salaireBrut, 'salaireBrut', 0, 100000000, true, errors);
  }
  if (req.body.salaireNet !== undefined) {
    validateNumber(req.body.salaireNet, 'salaireNet', 0, 100000000, true, errors);
  }
  if (req.body.personnesCharge !== undefined) {
    validateNumber(req.body.personnesCharge, 'personnesCharge', 0, 20, true, errors);
  }
  if (req.body.heuresSup !== undefined) {
    validateNumber(req.body.heuresSup, 'heuresSup', 0, 20, true, errors);
  }

  if (errors.length > 0) {
    res.status(422).json({ success: false, errors });
    return;
  }
  next();
};

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET current active barème
app.get('/api/irsa/bareme/actuel', (req, res) => {
  try {
    const bareme = getActiveBareme();
    res.json(bareme);
  } catch (error) {
    res.status(500).json({ error: "Impossible de récupérer le barème actif." });
  }
});

// POST update barème (Admin route)
// Protected by static token: 'irsa-admin-2026' or process.env.ADMIN_TOKEN
app.post('/api/irsa/bareme', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const expectedToken = process.env.ADMIN_TOKEN || 'irsa-admin-2026';

  if (!token || token !== expectedToken) {
    res.status(401).json({ error: "Non autorisé. Jeton d'administration invalide." });
    return;
  }

  const { annee, tranches, sme, plafondCnaps, plafondOstie, multiplPlaf, reductionCharge, minimumPerception, actif } = req.body;

  if (!annee || !tranches || !sme) {
    res.status(400).json({ error: "Les champs 'annee', 'tranches' et 'sme' sont requis." });
    return;
  }

  try {
    const updated = saveBareme({
      id: req.body.id,
      annee: Number(annee),
      tranches,
      sme: Number(sme),
      plafondCnaps: Number(plafondCnaps ?? 0.01),
      plafondOstie: Number(plafondOstie ?? 0.01),
      multiplPlaf: Number(multiplPlaf ?? 8),
      reductionCharge: Number(reductionCharge ?? 2000),
      minimumPerception: Number(minimumPerception ?? 3000),
      actif: Boolean(actif ?? true)
    });
    res.json({ success: true, bareme: updated });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la sauvegarde du barème." });
  }
});

// POST report calculation bug or anomaly
app.post('/api/irsa/anomalies', (req, res) => {
  const { nom, email, typeAnomalie, description, detailsCalcul } = req.body;
  if (!typeAnomalie || !description) {
    res.status(400).json({ error: "Les champs 'typeAnomalie' et 'description' sont requis." });
    return;
  }
  try {
    const saved = saveAnomalie({
      nom,
      email,
      typeAnomalie,
      description,
      detailsCalcul
    });
    res.json({ success: true, anomalie: saved });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de l'enregistrement du signalement." });
  }
});

// POST classique brut -> net
app.post('/api/irsa/brut-vers-net', validateIrsaInputs, (req, res) => {
  const { salaireBrut = 0, personnesCharge = 0, heuresSup = 0, sessionId } = req.body;
  const bareme = getActiveBareme();
  
  const result = calculerDepuisBrut(salaireBrut, personnesCharge, heuresSup, bareme);

  // If a sessionId is provided, save the calculation to history
  if (sessionId) {
    try {
      saveCalcul({
        sessionId,
        typeCalcul: TypeCalcul.BRUT_VERS_NET,
        salaireBrut: result.salaireBrut,
        salaireNet: null,
        personnesCharge: result.personnesCharge,
        heuresSup: result.heuresSup ?? 0,
        cnaps: result.cnaps,
        ostie: result.ostie,
        baseImposable: result.baseImposable,
        irsaCalcule: result.irsaFinal,
        salaireNetFinal: result.salaireNet,
        detailTranches: result.detailTranches,
        tauxEffectif: result.tauxEffectif,
        anneeBareme: result.anneeBareme
      });
    } catch (err) {
      console.error("Failed to save calculation to history", err);
    }
  }

  res.json(result);
});

// POST inverse net -> brut
app.post('/api/irsa/net-vers-brut', validateIrsaInputs, (req, res) => {
  const { salaireNet = 0, personnesCharge = 0, sessionId } = req.body;
  const bareme = getActiveBareme();

  const result = calculerDepuisNet(salaireNet, personnesCharge, bareme);

  // Save to history if sessionId is provided
  if (sessionId) {
    try {
      saveCalcul({
        sessionId,
        typeCalcul: TypeCalcul.NET_VERS_BRUT,
        salaireBrut: null,
        salaireNet: salaireNet,
        personnesCharge: result.personnesCharge,
        heuresSup: 0,
        cnaps: result.cnaps,
        ostie: result.ostie,
        baseImposable: result.baseImposable,
        irsaCalcule: result.irsaFinal,
        salaireNetFinal: result.salaireNet,
        detailTranches: result.detailTranches,
        tauxEffectif: result.tauxEffectif,
        anneeBareme: result.anneeBareme
      });
    } catch (err) {
      console.error("Failed to save calculation to history", err);
    }
  }

  res.json(result);
});

// POST simulation annuelle
app.post('/api/irsa/simulation-annuelle', validateIrsaInputs, (req, res) => {
  const { salaireBrut = 0, personnesCharge = 0, avec13eme = true, sessionId } = req.body;
  const bareme = getActiveBareme();

  const result = simulerAnnuel(salaireBrut, personnesCharge, avec13eme, bareme);

  if (sessionId) {
    try {
      saveCalcul({
        sessionId,
        typeCalcul: TypeCalcul.SIMULATION_ANNUELLE,
        salaireBrut,
        salaireNet: null,
        personnesCharge,
        heuresSup: 0,
        cnaps: result.annuel.cnaps,
        ostie: result.annuel.ostie,
        baseImposable: result.mensuel.baseImposable,
        irsaCalcule: result.annuel.irsaTotal,
        salaireNetFinal: result.annuel.salaireNet,
        detailTranches: result.mensuel.detailTranches,
        tauxEffectif: result.mensuel.tauxEffectif,
        anneeBareme: result.mensuel.anneeBareme
      });
    } catch (err) {
      console.error("Failed to save calculation to history", err);
    }
  }

  res.json(result);
});

// POST comparer salaires
app.post('/api/irsa/comparer', validateIrsaInputs, (req, res) => {
  const { salaire1 = 0, salaire2 = 0, personnesCharge = 0, sessionId } = req.body;
  const bareme = getActiveBareme();

  const result = comparerSalaires(salaire1, salaire2, personnesCharge, bareme);

  if (sessionId) {
    try {
      saveCalcul({
        sessionId,
        typeCalcul: TypeCalcul.COMPARAISON,
        salaireBrut: salaire1, // Store main salary as reference
        salaireNet: salaire2, // Store comparator as Net for storage space
        personnesCharge,
        heuresSup: 0,
        cnaps: result.salaire1.cnaps,
        ostie: result.salaire1.ostie,
        baseImposable: result.salaire1.baseImposable,
        irsaCalcule: result.salaire1.irsaFinal,
        salaireNetFinal: result.salaire1.salaireNet,
        detailTranches: result.salaire1.detailTranches,
        tauxEffectif: result.salaire1.tauxEffectif,
        anneeBareme: result.salaire1.anneeBareme
      });
    } catch (err) {
      console.error("Failed to save calculation to history", err);
    }
  }

  res.json(result);
});

// GET user session history
app.get('/api/historique/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  try {
    const list = getCalculsBySession(sessionId);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération de l'historique." });
  }
});

// DELETE user session history
app.delete('/api/historique/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  try {
    deleteCalculsBySession(sessionId);
    res.json({ success: true, message: "Historique supprimé avec succès." });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la suppression de l'historique." });
  }
});

// GET aggregate global stats
app.get('/api/stats/agregees', (req, res) => {
  try {
    const stats = getStatsAgregees();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors du calcul des statistiques." });
  }
});

// Vite & Static Asset Handling Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Development Mode with Vite Middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode serving compiled static files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
