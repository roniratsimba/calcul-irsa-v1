import fs from 'fs';
import path from 'path';
import { BaremeIRSA, CalculIRSADbRecord, StatsAgregees } from './types';
import { BAREME_2026_DEFAULT } from './irsaCalculator';

const DB_FILE_PATH = path.join(process.cwd(), 'data', 'db.json');

interface DatabaseSchema {
  baremes: BaremeIRSA[];
  calculs: CalculIRSADbRecord[];
}

// Ensure the data directory exists and database is initialized
export function initDb() {
  const dir = path.dirname(DB_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE_PATH)) {
    const initialData: DatabaseSchema = {
      baremes: [BAREME_2026_DEFAULT],
      calculs: []
    };
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(initialData, null, 2), 'utf8');
  }
}

// Read database
export function readDb(): DatabaseSchema {
  initDb();
  try {
    const content = fs.readFileSync(DB_FILE_PATH, 'utf8');
    return JSON.parse(content) as DatabaseSchema;
  } catch (error) {
    console.error('Error reading database file:', error);
    return { baremes: [BAREME_2026_DEFAULT], calculs: [] };
  }
}

// Write database atomically
export function writeDb(data: DatabaseSchema) {
  initDb();
  try {
    const tempPath = DB_FILE_PATH + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, DB_FILE_PATH);
  } catch (error) {
    console.error('Error writing database file:', error);
  }
}

// Get active barème
export function getActiveBareme(annee?: number): BaremeIRSA {
  const db = readDb();
  if (annee) {
    const found = db.baremes.find(b => b.annee === annee && b.actif);
    if (found) return found;
  }
  const active = db.baremes.find(b => b.actif);
  return active || BAREME_2026_DEFAULT;
}

// Save active barème or add/update
export function saveBareme(bareme: BaremeIRSA): BaremeIRSA {
  const db = readDb();
  
  // If this barème is set to active, deactivate others
  if (bareme.actif) {
    db.baremes.forEach(b => {
      if (b.annee !== bareme.annee) b.actif = false;
    });
  }

  const index = db.baremes.findIndex(b => b.annee === bareme.annee);
  const updatedBareme = {
    ...bareme,
    id: bareme.id || (index >= 0 ? db.baremes[index].id : db.baremes.length + 1),
    updatedAt: new Date().toISOString()
  };

  if (index >= 0) {
    db.baremes[index] = updatedBareme;
  } else {
    updatedBareme.createdAt = new Date().toISOString();
    db.baremes.push(updatedBareme);
  }

  writeDb(db);
  return updatedBareme;
}

// Save calculation history
export function saveCalcul(record: Omit<CalculIRSADbRecord, 'id' | 'createdAt'>): CalculIRSADbRecord {
  const db = readDb();
  const newRecord: CalculIRSADbRecord = {
    ...record,
    id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    createdAt: new Date().toISOString()
  };

  db.calculs.push(newRecord);
  writeDb(db);
  return newRecord;
}

// Get history by session ID
export function getCalculsBySession(sessionId: string): CalculIRSADbRecord[] {
  const db = readDb();
  return db.calculs
    .filter(c => c.sessionId === sessionId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Delete history by session ID
export function deleteCalculsBySession(sessionId: string): boolean {
  const db = readDb();
  const initialCount = db.calculs.length;
  db.calculs = db.calculs.filter(c => c.sessionId !== sessionId);
  writeDb(db);
  return db.calculs.length < initialCount;
}

// Compute aggregate stats dynamically
export function getStatsAgregees(): StatsAgregees {
  const db = readDb();
  const calculs = db.calculs;
  const totalCalculs = calculs.length;

  if (totalCalculs === 0) {
    return {
      totalCalculs: 0,
      salaireMoyen: 0,
      irsaMoyen: 0,
      tauxEffectifMoyen: 0,
      repartitionTranches: { t0: 0, t5: 0, t10: 0, t15: 0, t20: 0, t25: 0 }
    };
  }

  let totalSalaire = 0;
  let totalIrsa = 0;
  let totalTauxEffectif = 0;

  // Counts for each rate bracket
  let countT0 = 0;
  let countT5 = 0;
  let countT10 = 0;
  let countT15 = 0;
  let countT20 = 0;
  let countT25 = 0;

  calculs.forEach(c => {
    const salaire = c.salaireBrut || c.salaireNetFinal || 0;
    totalSalaire += salaire;
    totalIrsa += c.irsaCalcule;
    totalTauxEffectif += c.tauxEffectif;

    // Distribute into highest applicable rate based on detailTranches
    if (c.detailTranches && c.detailTranches.length > 0) {
      // Find the highest tax rate that actually had imposable money
      const activeTaux = c.detailTranches
        .filter(dt => dt.imposable > 0)
        .map(dt => dt.taux);
      
      const maxTaux = activeTaux.length > 0 ? Math.max(...activeTaux) : 0;
      
      if (maxTaux >= 0.25) countT25++;
      else if (maxTaux >= 0.20) countT20++;
      else if (maxTaux >= 0.15) countT15++;
      else if (maxTaux >= 0.10) countT10++;
      else if (maxTaux >= 0.05) countT5++;
      else countT0++;
    } else {
      countT0++;
    }
  });

  return {
    totalCalculs,
    salaireMoyen: Math.round(totalSalaire / totalCalculs),
    irsaMoyen: Math.round(totalIrsa / totalCalculs),
    tauxEffectifMoyen: parseFloat((totalTauxEffectif / totalCalculs).toFixed(2)),
    repartitionTranches: {
      t0: parseFloat(((countT0 / totalCalculs) * 100).toFixed(1)),
      t5: parseFloat(((countT5 / totalCalculs) * 100).toFixed(1)),
      t10: parseFloat(((countT10 / totalCalculs) * 100).toFixed(1)),
      t15: parseFloat(((countT15 / totalCalculs) * 100).toFixed(1)),
      t20: parseFloat(((countT20 / totalCalculs) * 100).toFixed(1)),
      t25: parseFloat(((countT25 / totalCalculs) * 100).toFixed(1))
    }
  };
}
