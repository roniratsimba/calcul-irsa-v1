import {
  CalculIRSAResult,
  SimulationAnnuelleResult,
  ComparaisonResult,
  BaremeIRSA,
  CalculIRSADbRecord,
  StatsAgregees,
  AnomalieRecord
} from './types';

// Get or create unique sessionId in localStorage for anonymous user histories
export function getSessionId(): string {
  let sessionId = localStorage.getItem('irsa_session_id');
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('irsa_session_id', sessionId);
  }
  return sessionId;
}

/**
 * API service helper functions
 */
export const api = {
  // Classic Brut to Net
  async brutVersNet(
    salaireBrut: number,
    personnesCharge: number = 0,
    heuresSup: number = 0
  ): Promise<CalculIRSAResult> {
    const response = await fetch('/api/irsa/brut-vers-net', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        salaireBrut,
        personnesCharge,
        heuresSup,
        sessionId: getSessionId()
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.errors?.join(', ') || 'Calcul brut vers net échoué.');
    }
    return response.json();
  },

  // Inverse Net to Brut
  async netVersBrut(
    salaireNet: number,
    personnesCharge: number = 0
  ): Promise<CalculIRSAResult> {
    const response = await fetch('/api/irsa/net-vers-brut', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        salaireNet,
        personnesCharge,
        sessionId: getSessionId()
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.errors?.join(', ') || 'Calcul inverse net vers brut échoué.');
    }
    return response.json();
  },

  // Annual projection
  async simulationAnnuelle(
    salaireBrut: number,
    personnesCharge: number = 0,
    avec13eme: boolean = true
  ): Promise<SimulationAnnuelleResult> {
    const response = await fetch('/api/irsa/simulation-annuelle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        salaireBrut,
        personnesCharge,
        avec13eme,
        sessionId: getSessionId()
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.errors?.join(', ') || 'Simulation annuelle échouée.');
    }
    return response.json();
  },

  // Salary comparison
  async comparer(
    salaire1: number,
    salaire2: number,
    personnesCharge: number = 0
  ): Promise<ComparaisonResult> {
    const response = await fetch('/api/irsa/comparer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        salaire1,
        salaire2,
        personnesCharge,
        sessionId: getSessionId()
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.errors?.join(', ') || 'Comparaison des salaires échouée.');
    }
    return response.json();
  },

  // Get current barème
  async getBareme(): Promise<BaremeIRSA> {
    const response = await fetch('/api/irsa/bareme/actuel');
    if (!response.ok) {
      throw new Error('Impossible de charger le barème fiscal actuel.');
    }
    return response.json();
  },

  // Get user calculation history
  async getHistory(): Promise<CalculIRSADbRecord[]> {
    const sessionId = getSessionId();
    const response = await fetch(`/api/historique/${sessionId}`);
    if (!response.ok) {
      throw new Error('Impossible de récupérer l\'historique.');
    }
    return response.json();
  },

  // Clear user calculation history
  async clearHistory(): Promise<boolean> {
    const sessionId = getSessionId();
    const response = await fetch(`/api/historique/${sessionId}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      throw new Error('Impossible d\'effacer l\'historique.');
    }
    const data = await response.json();
    return data.success;
  },

  // Get global aggregated stats
  async getGlobalStats(): Promise<StatsAgregees> {
    const response = await fetch('/api/stats/agregees');
    if (!response.ok) {
      throw new Error('Impossible d\'obtenir les statistiques globales.');
    }
    return response.json();
  },

  // Update barème (Admin route)
  async updateBareme(
    bareme: BaremeIRSA,
    token: string
  ): Promise<{ success: boolean; bareme: BaremeIRSA }> {
    const response = await fetch('/api/irsa/bareme', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(bareme)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Mise à jour du barème échouée.');
    }
    return response.json();
  },

  // Submit calculation bug or anomaly report
  async submitAnomalie(record: AnomalieRecord): Promise<{ success: boolean; anomalie: AnomalieRecord }> {
    const response = await fetch('/api/irsa/anomalies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(record)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "Échec de l'enregistrement du signalement d'anomalie.");
    }
    return response.json();
  }
};
