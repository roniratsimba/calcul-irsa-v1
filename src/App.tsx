import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calculator,
  BookOpen,
  History,
  Sun,
  Moon,
  Sparkles,
  Copy,
  FileText,
  RefreshCw,
  Trash2,
  ArrowRight,
  Check,
  Info,
  AlertTriangle,
  Users,
  TrendingUp,
  DollarSign,
  Briefcase,
  ExternalLink,
  ChevronRight,
  TrendingDown,
  Settings,
  Lock,
  Unlock,
  Save,
  Plus,
  X,
  Home
} from 'lucide-react';
import { jsPDF } from 'jspdf';

import { api } from './api';
import {
  TypeCalcul,
  BaremeIRSA,
  CalculIRSAResult,
  SimulationAnnuelleResult,
  ComparaisonResult,
  CalculIRSADbRecord,
  StatsAgregees,
  Tranche
} from './types';
import SalaryInput from './components/SalaryInput';
import ResultCard from './components/ResultCard';
import TrancheVisualizer from './components/TrancheVisualizer';
import FaqAccordion from './components/FaqAccordion';

export default function App() {
  // Navigation: 'home' | 'calculateur' | 'guide' | 'historique' | 'admin'
  const [currentPage, setCurrentPage] = useState<'home' | 'calculateur' | 'guide' | 'historique' | 'admin'>('home');
  
  // Theme state (Dark Mode by default)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Admin credentials and barème edit state
  const [adminToken, setAdminToken] = useState<string>(() => sessionStorage.getItem('irsa_admin_token') || '');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => !!sessionStorage.getItem('irsa_admin_token'));
  const [adminTokenInput, setAdminTokenInput] = useState<string>('');
  const [adminBareme, setAdminBareme] = useState<BaremeIRSA | null>(null);
  const [isSavingBareme, setIsSavingBareme] = useState<boolean>(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Global app data loaded from server
  const [activeBareme, setActiveBareme] = useState<BaremeIRSA | null>(null);
  const [globalStats, setGlobalStats] = useState<StatsAgregees | null>(null);
  const [userHistory, setUserHistory] = useState<CalculIRSADbRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Calculator inputs
  const [calcMode, setCalcMode] = useState<TypeCalcul>(TypeCalcul.BRUT_VERS_NET);
  const [salaireBrut, setSalaireBrut] = useState<number>(1500000);
  const [salaireNetCible, setSalaireNetCible] = useState<number>(1200000);
  const [personnesCharge, setPersonnesCharge] = useState<number>(0);
  const [heuresSup, setHeuresSup] = useState<number>(0);
  const [avec13eme, setAvec13eme] = useState<boolean>(true);

  // Comparison inputs
  const [compSalaire1, setCompSalaire1] = useState<number>(1000000);
  const [compSalaire2, setCompSalaire2] = useState<number>(1500000);

  // Calculation results state
  const [brutToNetResult, setBrutToNetResult] = useState<CalculIRSAResult | null>(null);
  const [netToBrutResult, setNetToBrutResult] = useState<CalculIRSAResult | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationAnnuelleResult | null>(null);
  const [comparaisonResult, setComparaisonResult] = useState<ComparaisonResult | null>(null);

  // Interactive feedback triggers (toasts)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // SVG Chart interactive hover state
  const [hoveredChartMonth, setHoveredChartMonth] = useState<number | null>(null);

  // Trigger temporary toast notifications
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Sync layout mode with document elements
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.remove('light-mode');
    } else {
      root.classList.add('light-mode');
    }
  }, [isDarkMode]);

  // Load baseline statistics and active barème on startup
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const bar = await api.getBareme();
        setActiveBareme(bar);
        
        const stats = await api.getGlobalStats();
        setGlobalStats(stats);
      } catch (err) {
        console.error("Failed to load initial server metadata", err);
      }
    };
    loadInitialData();
  }, []);

  // Sync loaded activeBareme to admin edit copy
  useEffect(() => {
    if (activeBareme && !adminBareme) {
      setAdminBareme(JSON.parse(JSON.stringify(activeBareme)));
    }
  }, [activeBareme]);

  // Handle Admin Passcode login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    if (!adminTokenInput.trim()) {
      setAdminError("Veuillez saisir un mot de passe d'administration.");
      return;
    }

    if (!activeBareme) {
      setAdminError("Le barème d'origine n'est pas encore disponible.");
      return;
    }

    setLoading(true);
    try {
      // Test the adminTokenInput by posting activeBareme to check authentication
      await api.updateBareme(activeBareme, adminTokenInput);
      setAdminToken(adminTokenInput);
      setIsAdminAuthenticated(true);
      sessionStorage.setItem('irsa_admin_token', adminTokenInput);
      triggerToast("Authentification Administrateur réussie !");
    } catch (err: any) {
      setAdminError(err.message || "Mot de passe d'administration invalide.");
    } finally {
      setLoading(false);
    }
  };

  // Update specific tranche bounds/rate inside the admin form
  const handleUpdateTranche = (idx: number, field: keyof Tranche, val: any) => {
    if (!adminBareme) return;
    const newTranches = [...adminBareme.tranches];
    newTranches[idx] = { ...newTranches[idx], [field]: val };
    setAdminBareme({ ...adminBareme, tranches: newTranches });
  };

  // Save the modified barème back to db
  const handleSaveBareme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminBareme) return;
    setIsSavingBareme(true);
    setAdminError(null);
    try {
      // Basic validations
      if (adminBareme.sme <= 0) throw new Error("Le SME doit être supérieur à 0.");
      if (adminBareme.reductionCharge < 0) throw new Error("La réduction pour charge de famille doit être supérieure ou égale à 0.");
      if (adminBareme.minimumPerception < 0) throw new Error("Le minimum de perception doit être supérieur ou égal à 0.");
      
      const res = await api.updateBareme(adminBareme, adminToken);
      if (res.success) {
        setActiveBareme(res.bareme);
        triggerToast("Le barème fiscal a été enregistré et activé !");
        setCurrentPage('home');
      }
    } catch (err: any) {
      setAdminError(err.message || "Échec de l'enregistrement du barème.");
    } finally {
      setIsSavingBareme(false);
    }
  };

  // Logout from Admin Session
  const handleAdminLogout = () => {
    setAdminToken('');
    setIsAdminAuthenticated(false);
    setAdminTokenInput('');
    sessionStorage.removeItem('irsa_admin_token');
    triggerToast("Session administrateur fermée.");
    setCurrentPage('home');
  };

  // Retrieve session history
  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const list = await api.getHistory();
      setUserHistory(list);
    } catch (err) {
      console.error("Failed to load session history log", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (currentPage === 'historique') {
      loadHistory();
    }
  }, [currentPage]);

  // Recalculate based on inputs & debouncing
  useEffect(() => {
    const handleCalculations = async () => {
      setLoading(true);
      try {
        if (calcMode === TypeCalcul.BRUT_VERS_NET) {
          const res = await api.brutVersNet(salaireBrut, personnesCharge, heuresSup);
          setBrutToNetResult(res);
        } else if (calcMode === TypeCalcul.NET_VERS_BRUT) {
          const res = await api.netVersBrut(salaireNetCible, personnesCharge);
          setNetToBrutResult(res);
        } else if (calcMode === TypeCalcul.SIMULATION_ANNUELLE) {
          const res = await api.simulationAnnuelle(salaireBrut, personnesCharge, avec13eme);
          setSimulationResult(res);
        } else if (calcMode === TypeCalcul.COMPARAISON) {
          const res = await api.comparer(compSalaire1, compSalaire2, personnesCharge);
          setComparaisonResult(res);
        }
      } catch (err) {
        console.error("API Calculation Error:", err);
      } finally {
        setLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      handleCalculations();
    }, 250); // Small 250ms debounce for high-performance typing updates

    return () => clearTimeout(delayDebounceFn);
  }, [calcMode, salaireBrut, salaireNetCible, personnesCharge, heuresSup, avec13eme, compSalaire1, compSalaire2]);

  // Reset current inputs
  const handleResetInputs = () => {
    setSalaireBrut(1500000);
    setSalaireNetCible(1200000);
    setPersonnesCharge(0);
    setHeuresSup(0);
    setAvec13eme(true);
    setCompSalaire1(1000000);
    setCompSalaire2(1500000);
    triggerToast("Calculateur réinitialisé avec succès.");
  };

  // Clear all anonymous session records
  const handleClearHistory = async () => {
    if (confirm("Voulez-vous vraiment effacer l'intégralité de votre historique ?")) {
      try {
        await api.clearHistory();
        setUserHistory([]);
        triggerToast("Historique de calculs effacé.");
        // Reload stats
        const stats = await api.getGlobalStats();
        setGlobalStats(stats);
      } catch (err) {
        triggerToast("Erreur lors de l'effacement de l'historique.");
      }
    }
  };

  // Restore calculations from historical records
  const handleRecallHistory = (record: CalculIRSADbRecord) => {
    setCalcMode(record.typeCalcul);
    setPersonnesCharge(record.personnesCharge);
    setHeuresSup(record.heuresSup);
    
    if (record.typeCalcul === TypeCalcul.BRUT_VERS_NET) {
      setSalaireBrut(record.salaireBrut || 1500000);
    } else if (record.typeCalcul === TypeCalcul.NET_VERS_BRUT) {
      setSalaireNetCible(record.salaireNet || 1200000);
    } else if (record.typeCalcul === TypeCalcul.SIMULATION_ANNUELLE) {
      setSalaireBrut(record.salaireBrut || 1500000);
    } else if (record.typeCalcul === TypeCalcul.COMPARAISON) {
      setCompSalaire1(record.salaireBrut || 1000000);
      setCompSalaire2(record.salaireNet || 1500000);
    }

    setCurrentPage('calculateur');
    triggerToast("Données chargées dans le calculateur !");
  };

  // Format monetary value with spaces
  const formatAr = (num: number) => {
    return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' Ar';
  };

  // Copy textual summary to clipboard
  const handleCopySummary = (result: CalculIRSAResult | null, modeLabel: string) => {
    if (!result) return;
    const txt = `--- SIMULATION CALCUL IRSA MADAGASCAR ---
Mode: ${modeLabel}
Salaire Brut: ${formatAr(result.salaireBrut)}
CNaPS salarié (1%): ${formatAr(result.cnaps)}
OSTIE salarié (1%): ${formatAr(result.ostie)}
Base Imposable: ${formatAr(result.baseImposable)}
IRSA calculé (Net): ${formatAr(result.irsaFinal)}
Salaire Net Final: ${formatAr(result.salaireNet)}
Taux de taxation effectif: ${result.tauxEffectif}%
Charges de famille: ${result.personnesCharge} personne(s) à charge
Heures supplémentaires: ${result.heuresSup ?? 0}h exonérées
Généré le: ${new Date().toLocaleDateString()}
Web App IRSA Madagascar`;

    navigator.clipboard.writeText(txt);
    triggerToast("Résumé copié dans le presse-papier !");
  };

  // Exporter un PDF via jsPDF
  const handleExportPDF = (result: CalculIRSAResult | null, title: string) => {
    if (!result) return;
    const doc = new jsPDF();

    // Visual layout setup
    doc.setFillColor(10, 10, 15); // Dark blue header background
    doc.rect(0, 0, 210, 45, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('RELEVE DE SIMULATION IRSA', 14, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 180);
    doc.text('Référence fiscale nationale de la République de Madagascar', 14, 28);
    doc.text(`Barème Fiscal : Loi de finances ${result.anneeBareme}`, 14, 34);

    doc.setFontSize(9);
    doc.setTextColor(220, 220, 220);
    doc.text(`Date de calcul : ${new Date().toLocaleString()}`, 145, 34);

    // Reset layout
    doc.setTextColor(18, 18, 23);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 60);

    // Draw horizontal separator
    doc.setDrawColor(220, 220, 225);
    doc.line(14, 65, 196, 65);

    // Subtitle variables
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Paramètres pris en compte :', 14, 75);
    doc.setFont('helvetica', 'normal');
    doc.text(`Personnes à charge : ${result.personnesCharge}`, 14, 82);
    doc.text(`Heures supplémentaires : ${result.heuresSup ?? 0} h exonérées`, 14, 88);

    // Table of variables
    doc.setFont('helvetica', 'bold');
    doc.text('Détails des éléments de paie :', 14, 105);

    const elements = [
      { l: 'Salaire Brut Global', v: formatAr(result.salaireBrut), b: true },
      { l: 'Cotisation CNaPS (1% salarié)', v: '-' + formatAr(result.cnaps), b: false },
      { l: 'Cotisation Organisme de Santé (1% OSTIE)', v: '-' + formatAr(result.ostie), b: false },
      { l: 'Assiette / Base Imposable IRSA', v: formatAr(result.baseImposable), b: true },
      { l: 'IRSA Brut Progressif', v: formatAr(result.irsaBrut), b: false },
      { l: "Réduction pour charges familiales", v: '-' + formatAr(result.reductionCharge), b: false },
      { l: 'IRSA Net à Payer (Retenue)', v: formatAr(result.irsaFinal), b: true },
      { l: 'Salaire Net Final perçu', v: formatAr(result.salaireNet), b: true, highlight: true }
    ];

    let y = 115;
    elements.forEach(el => {
      if (el.b) {
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont('helvetica', 'normal');
      }

      if (el.highlight) {
        doc.setFillColor(240, 250, 245); // light green background
        doc.rect(12, y - 5, 186, 8, 'F');
        doc.setTextColor(16, 120, 70); // green text
      } else {
        doc.setTextColor(18, 18, 23);
      }

      doc.text(el.l, 14, y);
      doc.text(el.v, 145, y);
      
      doc.setDrawColor(240, 240, 245);
      doc.line(14, y + 3, 196, y + 3);
      y += 10;
    });

    // Progressive Bracket table summary
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(18, 18, 23);
    doc.text('Détail de l\'impôt progressif par tranches :', 14, y + 10);
    y += 20;

    // Table columns
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 120);
    doc.text('Tranche', 14, y);
    doc.text('Taux', 45, y);
    doc.text('Montant imposable', 75, y);
    doc.text('Impôt calculé', 135, y);

    doc.line(14, y + 2, 196, y + 2);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(18, 18, 23);
    result.detailTranches.forEach(dt => {
      doc.text(`Palier : ${dt.min / 1000}k à ${dt.max ? dt.max / 1000 + 'k' : '+' }`, 14, y);
      doc.text(`${(dt.taux * 100)}%`, 45, y);
      doc.text(formatAr(dt.imposable), 75, y);
      doc.text(formatAr(dt.impot), 135, y);
      y += 6;
    });

    // Bottom footer disclaimer
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 150);
    doc.text("L'IRSA est un impôt retenu à la source par l'employeur et déclaré mensuellement.", 14, 280);
    doc.text("Document de simulation à valeur informative uniquement — Ministère de l'Économie et des Finances.", 14, 284);

    doc.save(`IRSA_Simulation_${result.salaireBrut}_Ar.pdf`);
    triggerToast("PDF téléchargé avec succès.");
  };

  // Custom Interactive SVG Chart Month Projection Data
  const monthlyData = useMemo(() => {
    if (!simulationResult) return [];
    
    const list = [];
    for (let i = 1; i <= 12; i++) {
      list.push({
        label: `Mois ${i}`,
        brut: simulationResult.mensuel.salaireBrut,
        net: simulationResult.mensuel.salaireNet,
        irsa: simulationResult.mensuel.irsaFinal
      });
    }

    if (avec13eme && simulationResult.detail13eme) {
      list.push({
        label: `13ème Mois`,
        brut: simulationResult.detail13eme.salaireBrut,
        net: simulationResult.detail13eme.salaireNet,
        irsa: simulationResult.detail13eme.irsaFinal
      });
    }

    return list;
  }, [simulationResult, avec13eme]);

  // Max value for chart scaling
  const chartMax = useMemo(() => {
    if (monthlyData.length === 0) return 100;
    return Math.max(...monthlyData.map(d => d.brut)) * 1.15;
  }, [monthlyData]);

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex flex-col relative select-none">
      
      {/* Decorative Radial Background Lights & Accent Color Decoration */}
      <div className="absolute top-[-5%] left-[10%] w-[500px] h-[500px] bg-[#7C3AED]/8 dark:bg-[#7C3AED]/12 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse-slow" />
      <div className="absolute bottom-[20%] right-[5%] w-[450px] h-[450px] bg-[#6366F1]/8 dark:bg-[#6366F1]/10 rounded-full blur-[130px] pointer-events-none -z-10" />
      <div className="absolute top-[40%] right-[30%] w-[350px] h-[350px] bg-[#EC4899]/4 dark:bg-[#EC4899]/5 rounded-full blur-[110px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] left-[5%] w-[400px] h-[400px] bg-[#F59E0B]/3 dark:bg-[#F59E0B]/4 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Elegant Header Navbar */}
      <nav className="w-full border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-primary)]/80 backdrop-blur-md sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentPage('home')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7C3AED] to-[#6366F1] flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-base leading-tight tracking-tight">
                IRSA Madagascar
              </span>
              <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--color-text-muted)]">
                Portail de référence
              </span>
            </div>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setCurrentPage('home')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                currentPage === 'home'
                  ? 'bg-gradient-to-r from-[#7C3AED]/10 to-[#6366F1]/10 text-[#C084FC] border border-[#7C3AED]/30'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-input)] border border-transparent'
              }`}
            >
              Accueil
            </button>
            <button
              onClick={() => setCurrentPage('calculateur')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                currentPage === 'calculateur'
                  ? 'bg-gradient-to-r from-[#7C3AED]/10 to-[#6366F1]/10 text-[#C084FC] border border-[#7C3AED]/30'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-input)] border border-transparent'
              }`}
            >
              Calculateur
            </button>
            <button
              onClick={() => setCurrentPage('guide')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                currentPage === 'guide'
                  ? 'bg-gradient-to-r from-[#7C3AED]/10 to-[#6366F1]/10 text-[#C084FC] border border-[#7C3AED]/30'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-input)] border border-transparent'
              }`}
            >
              Guide IRSA
            </button>
            <button
              onClick={() => setCurrentPage('historique')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                currentPage === 'historique'
                  ? 'bg-gradient-to-r from-[#7C3AED]/10 to-[#6366F1]/10 text-[#C084FC] border border-[#7C3AED]/30'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-input)] border border-transparent'
              }`}
            >
              Historique
            </button>
            <button
              onClick={() => setCurrentPage('admin')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all inline-flex items-center gap-1 ${
                currentPage === 'admin'
                  ? 'bg-gradient-to-r from-[#7C3AED]/10 to-[#6366F1]/10 text-[#C084FC] border border-[#7C3AED]/30'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-input)] border border-transparent'
              }`}
            >
              <Settings className="w-3.5 h-3.5" /> Barème
            </button>
          </div>

          {/* Right utility buttons */}
          <div className="flex items-center gap-3">
            {/* Light/Dark Mode toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
              title={isDarkMode ? "Activer le mode clair" : "Activer le mode sombre"}
            >
              {isDarkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>

            {/* CTA to active calculator */}
            <button
              onClick={() => setCurrentPage('calculateur')}
              className="hidden sm:flex px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-gradient-to-r from-[#7C3AED] to-[#6366F1] hover:opacity-95 text-white rounded-xl transition-all shadow-md cursor-pointer"
            >
              Calculer IRSA
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Pages Router */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 pb-24 md:pb-8">
        <AnimatePresence mode="wait">
          
          {/* PAGE 1: HOME LANDING */}
          {currentPage === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-12"
            >
              {/* Hero Section */}
              <div className="text-center py-12 flex flex-col items-center gap-5 max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-[#7C3AED]/10 text-purple-400 text-xs font-semibold uppercase tracking-widest animate-pulse-slow">
                  <Sparkles className="w-3.5 h-3.5" /> Barème Fiscal 2026 opérationnel
                </div>
                <h1 className="text-4xl md:text-6xl font-display font-extrabold tracking-tight leading-tight">
                  Calculez Votre <span className="text-gradient">IRSA</span> en Quelques Secondes
                </h1>
                <p className="text-base md:text-lg text-[var(--color-text-secondary)] leading-relaxed font-light">
                  Déterminez en toute conformité avec l'administration fiscale de Madagascar (DGI) l'impôt sur les revenus salariaux, les charges sociales CNaPS & OSTIE, et optimisez votre net final.
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <button
                    onClick={() => {
                      setCalcMode(TypeCalcul.BRUT_VERS_NET);
                      setCurrentPage('calculateur');
                    }}
                    className="px-6 py-3.5 bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-purple-500/25 hover:opacity-95 transition-all cursor-pointer"
                  >
                    Simuler Brut → Net <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage('guide')}
                    className="px-6 py-3.5 border border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)] font-semibold rounded-xl hover:bg-[var(--color-bg-input)] transition-colors cursor-pointer"
                  >
                    Lire le guide
                  </button>
                </div>
              </div>

              {/* Server Stats Indicators */}
              {globalStats && globalStats.totalCalculs > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="glass-panel p-5 flex items-center gap-4">
                    <div className="p-3 bg-purple-500/15 text-purple-400 rounded-xl">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-[var(--color-text-muted)] font-display tracking-wider">Simulations Globales</p>
                      <h4 className="text-xl font-bold font-mono text-[var(--color-text-primary)] mt-0.5">{globalStats.totalCalculs}</h4>
                    </div>
                  </div>
                  <div className="glass-panel p-5 flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-xl">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-[var(--color-text-muted)] font-display tracking-wider">Salaire Brut Moyen</p>
                      <h4 className="text-xl font-bold font-mono text-[var(--color-text-primary)] mt-0.5">{formatAr(globalStats.salaireMoyen)}</h4>
                    </div>
                  </div>
                  <div className="glass-panel p-5 flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/15 text-indigo-400 rounded-xl">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-[var(--color-text-muted)] font-display tracking-wider">Retenue IRSA Moyenne</p>
                      <h4 className="text-xl font-bold font-mono text-[var(--color-text-primary)] mt-0.5">{formatAr(globalStats.irsaMoyen)}</h4>
                    </div>
                  </div>
                  <div className="glass-panel p-5 flex items-center gap-4">
                    <div className="p-3 bg-amber-500/15 text-amber-400 rounded-xl">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-[var(--color-text-muted)] font-display tracking-wider">Taux Effectif Moyen</p>
                      <h4 className="text-xl font-bold font-mono text-[var(--color-text-primary)] mt-0.5">{globalStats.tauxEffectifMoyen}%</h4>
                    </div>
                  </div>
                </div>
              )}

              {/* Mode Selection Grid Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div
                  onClick={() => {
                    setCalcMode(TypeCalcul.BRUT_VERS_NET);
                    setCurrentPage('calculateur');
                  }}
                  className="glass-panel p-6 flex flex-col gap-4 cursor-pointer hover:border-purple-500/40 hover:-translate-y-1 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#7C3AED]/15 text-[#7C3AED] flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-display font-semibold group-hover:text-purple-400 transition-colors">Calcul Classique Brut → Net</h3>
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      Déterminez votre salaire net final à partir de votre rémunération brute globale, après déduction des cotisations CNaPS et OSTIE.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#7C3AED] flex items-center gap-1.5 mt-2">
                    Lancer la simulation <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>

                <div
                  onClick={() => {
                    setCalcMode(TypeCalcul.NET_VERS_BRUT);
                    setCurrentPage('calculateur');
                  }}
                  className="glass-panel p-6 flex flex-col gap-4 cursor-pointer hover:border-emerald-500/40 hover:-translate-y-1 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                    <TrendingDown className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-display font-semibold group-hover:text-emerald-400 transition-colors">Calcul Inverse Net → Brut</h3>
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      Saisissez le salaire net final que vous souhaitez percevoir pour retrouver le salaire brut correspondant à faire figurer sur le contrat.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mt-2">
                    Lancer la simulation <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>

                <div
                  onClick={() => {
                    setCalcMode(TypeCalcul.SIMULATION_ANNUELLE);
                    setCurrentPage('calculateur');
                  }}
                  className="glass-panel p-6 flex flex-col gap-4 cursor-pointer hover:border-indigo-500/40 hover:-translate-y-1 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-display font-semibold group-hover:text-indigo-400 transition-colors">Simulation Annuelle</h3>
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      Projetez vos revenus sur une année complète (12 mois) avec l'intégration optionnelle du 13ème mois et des graphiques comparatifs.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5 mt-2">
                    Lancer la simulation <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              {/* Barème table display */}
              {activeBareme && (
                <div className="glass-panel p-6 flex flex-col gap-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-display font-bold">Barème Officiel Progressive de l'IRSA ({activeBareme.annee})</h3>
                      <p className="text-xs text-[var(--color-text-secondary)]">Défini par la Direction Générale des Impôts de Madagascar</p>
                    </div>
                    <span className="px-3 py-1 bg-green-500/15 text-green-400 text-xs rounded-full font-semibold border border-green-500/20">
                      Barème en vigueur
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-muted)] font-display uppercase text-[10px] tracking-wider">
                          <th className="pb-3 font-semibold">Tranche</th>
                          <th className="pb-3 font-semibold">Seuil Minimal</th>
                          <th className="pb-3 font-semibold">Seuil Maximal</th>
                          <th className="pb-3 font-semibold text-right">Taux d'Imposition</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/40">
                        {activeBareme.tranches.map((t, idx) => (
                          <tr key={idx} className="hover:bg-[var(--color-bg-input)] transition-colors">
                            <td className="py-3 font-medium">Tranche {idx + 1}</td>
                            <td className="py-3 font-mono">{formatAr(t.min)}</td>
                            <td className="py-3 font-mono">{t.max === 999999999 ? 'Au-delà' : formatAr(t.max)}</td>
                            <td className="py-3 font-mono font-bold text-right text-[var(--color-accent-violet)]">{t.taux * 100}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-zinc-800/40 text-xs text-[var(--color-text-secondary)]">
                    <div className="flex gap-2 items-start">
                      <Info className="w-4.5 h-4.5 text-purple-400 shrink-0" />
                      <p>
                        <strong>Salaire Minimum d'Embauche (SME) :</strong> {formatAr(activeBareme.sme)} par mois en 2026.
                      </p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <Info className="w-4.5 h-4.5 text-purple-400 shrink-0" />
                      <p>
                        <strong>Plafond Social :</strong> Les charges CNaPS et OSTIE (1% salarié) sont plafonnées à {formatAr(activeBareme.sme * activeBareme.multiplPlaf)} par mois (8x SME).
                      </p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <Info className="w-4.5 h-4.5 text-purple-400 shrink-0" />
                      <p>
                        <strong>Minimum de Perception :</strong> L'IRSA ne peut pas descendre sous {formatAr(activeBareme.minimumPerception)} par mois si vous êtes imposable.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* PAGE 2: CALCULATEUR SCREEN */}
          {currentPage === 'calculateur' && (
            <motion.div
              key="calculateur"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-6"
            >
              {/* Tabs Switch Mode */}
              <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4 flex-wrap gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-display font-extrabold tracking-tight">Calculateur d'Impôts Madagascar</h1>
                  <p className="text-xs text-[var(--color-text-secondary)]">Simulateur complet actualisé conforme aux normes fiscales</p>
                </div>
                
                {/* Mode tabs */}
                <div className="flex rounded-xl bg-[var(--color-bg-input)] p-1 border border-[var(--color-border-subtle)] overflow-x-auto w-full md:w-auto">
                  <button
                    onClick={() => setCalcMode(TypeCalcul.BRUT_VERS_NET)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                      calcMode === TypeCalcul.BRUT_VERS_NET
                        ? 'bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white'
                        : 'text-[var(--color-text-secondary)] hover:text-white'
                    }`}
                  >
                    Brut → Net
                  </button>
                  <button
                    onClick={() => setCalcMode(TypeCalcul.NET_VERS_BRUT)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                      calcMode === TypeCalcul.NET_VERS_BRUT
                        ? 'bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white'
                        : 'text-[var(--color-text-secondary)] hover:text-white'
                    }`}
                  >
                    Net → Brut
                  </button>
                  <button
                    onClick={() => setCalcMode(TypeCalcul.SIMULATION_ANNUELLE)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                      calcMode === TypeCalcul.SIMULATION_ANNUELLE
                        ? 'bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white'
                        : 'text-[var(--color-text-secondary)] hover:text-white'
                    }`}
                  >
                    Simulation Annuelle
                  </button>
                  <button
                    onClick={() => setCalcMode(TypeCalcul.COMPARAISON)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                      calcMode === TypeCalcul.COMPARAISON
                        ? 'bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white'
                        : 'text-[var(--color-text-secondary)] hover:text-white'
                    }`}
                  >
                    Comparateur
                  </button>
                </div>
              </div>

              {/* Layout splits 2 columns on desktop, stack on mobile */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Column Forms */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  <div className="glass-panel p-6 flex flex-col gap-5">
                    <h2 className="text-base font-display font-semibold border-b border-zinc-800/40 pb-2">
                      Remplissez les informations de paie
                    </h2>

                    {/* Salary inputs based on current mode */}
                    {calcMode === TypeCalcul.BRUT_VERS_NET && (
                      <SalaryInput
                        id="salaire-brut-input"
                        label="Salaire Brut Mensuel"
                        value={salaireBrut}
                        onChange={setSalaireBrut}
                      />
                    )}

                    {calcMode === TypeCalcul.NET_VERS_BRUT && (
                      <SalaryInput
                        id="salaire-net-input"
                        label="Salaire Net Souhaité"
                        value={salaireNetCible}
                        onChange={setSalaireNetCible}
                        max={8000000}
                      />
                    )}

                    {calcMode === TypeCalcul.SIMULATION_ANNUELLE && (
                      <SalaryInput
                        id="salaire-brut-annuel-input"
                        label="Salaire Brut Mensuel"
                        value={salaireBrut}
                        onChange={setSalaireBrut}
                      />
                    )}

                    {calcMode === TypeCalcul.COMPARAISON && (
                      <div className="flex flex-col gap-4">
                        <SalaryInput
                          id="salaire-brut-comp1"
                          label="Salaire Brut de Base (A)"
                          value={compSalaire1}
                          onChange={setCompSalaire1}
                          max={8000000}
                        />
                        <SalaryInput
                          id="salaire-brut-comp2"
                          label="Salaire Brut Comparé (B)"
                          value={compSalaire2}
                          onChange={setCompSalaire2}
                          max={8000000}
                        />
                      </div>
                    )}

                    {/* Step stepper: Personnes à charge (0 - 10) */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs uppercase tracking-wider text-[var(--color-text-secondary)] font-display font-semibold">
                          Personnes à charge de famille
                        </label>
                        <span className="text-xs font-mono font-bold text-purple-400">
                          -{personnesCharge * 2000} Ar de réduction
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPersonnesCharge(Math.max(0, personnesCharge - 1))}
                          className="w-10 h-10 rounded-xl bg-[var(--color-bg-input)] border border-[var(--color-border-subtle)] flex items-center justify-center font-bold text-lg hover:bg-zinc-800 transition-colors"
                        >
                          -
                        </button>
                        <div className="flex-1 h-10 bg-[var(--color-bg-input)] border border-[var(--color-border-subtle)] rounded-xl flex items-center justify-center font-mono font-bold">
                          {personnesCharge}
                        </div>
                        <button
                          onClick={() => setPersonnesCharge(Math.min(10, personnesCharge + 1))}
                          className="w-10 h-10 rounded-xl bg-[var(--color-bg-input)] border border-[var(--color-border-subtle)] flex items-center justify-center font-bold text-lg hover:bg-zinc-800 transition-colors"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-[10px] text-[var(--color-text-muted)]">
                        Réduction directe d'IRSA de 2 000 Ar par mois pour chaque enfant ou conjoint à charge.
                      </p>
                    </div>

                    {/* Overtime Exemption Input (Only applicable for Classic Brut to Net) */}
                    {calcMode === TypeCalcul.BRUT_VERS_NET && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs uppercase tracking-wider text-[var(--color-text-secondary)] font-display font-semibold">
                            Heures supplémentaires exonérées
                          </label>
                          <span className="text-xs font-mono font-bold text-indigo-400">
                            {heuresSup} h / mois (max 20)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setHeuresSup(Math.max(0, heuresSup - 1))}
                            className="w-10 h-10 rounded-xl bg-[var(--color-bg-input)] border border-[var(--color-border-subtle)] flex items-center justify-center font-bold text-lg hover:bg-zinc-800 transition-colors"
                          >
                            -
                        </button>
                          <div className="flex-1 h-10 bg-[var(--color-bg-input)] border border-[var(--color-border-subtle)] rounded-xl flex items-center justify-center font-mono font-bold">
                            {heuresSup}
                          </div>
                          <button
                            onClick={() => setHeuresSup(Math.min(20, heuresSup + 1))}
                            className="w-10 h-10 rounded-xl bg-[var(--color-bg-input)] border border(--color-border-subtle) flex items-center justify-center font-bold text-lg hover:bg-zinc-800 transition-colors"
                          >
                            +
                          </button>
                        </div>
                        <p className="text-[10px] text-[var(--color-text-muted)]">
                          Les heures supplémentaires validées sont défiscalisées jusqu'à 20h, déduites de l'assiette IRSA.
                        </p>
                      </div>
                    )}

                    {/* Toggle: 13th month for annual projections */}
                    {calcMode === TypeCalcul.SIMULATION_ANNUELLE && (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-bg-input)] border border-[var(--color-border-subtle)] mt-2">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold uppercase tracking-wider font-display">Inclure un 13ème Mois</span>
                          <span className="text-[10px] text-[var(--color-text-secondary)]">Calculé comme prime exonérée de charges de bases</span>
                        </div>
                        <button
                          onClick={() => setAvec13eme(!avec13eme)}
                          className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${avec13eme ? 'bg-[#7C3AED]' : 'bg-zinc-800'}`}
                        >
                          <div className={`bg-white w-4 h-4 rounded-full shadow transition-transform ${avec13eme ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    )}

                    {/* Common controls */}
                    <div className="flex items-center gap-3 pt-4 border-t border-zinc-800/40">
                      <button
                        onClick={handleResetInputs}
                        className="flex-1 px-4 h-11 border border-[var(--color-border-subtle)] rounded-xl text-xs uppercase tracking-wider font-bold hover:bg-[var(--color-bg-input)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Réinitialiser
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column Results */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  
                  {/* Results: MODE 1 BRUT TO NET */}
                  {calcMode === TypeCalcul.BRUT_VERS_NET && brutToNetResult && (
                    <div className="flex flex-col gap-6">
                      {/* Top Highlight Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ResultCard
                          id="result-irsa-val"
                          label="IRSA Net Retenu"
                          value={brutToNetResult.irsaFinal}
                          icon="Award"
                          type="irsa"
                          description="Impôt net mensuel prélevé à la source"
                        />
                        <ResultCard
                          id="result-net-val"
                          label="Salaire Net Final"
                          value={brutToNetResult.salaireNet}
                          icon="TrendingUp"
                          type="success"
                          description="Rémunération nette perçue en Ariary"
                        />
                      </div>

                      {/* Intermediate Calculations summary panel */}
                      <div className="glass-panel p-6 flex flex-col gap-4">
                        <h3 className="text-sm font-display font-bold uppercase tracking-wider text-[var(--color-text-secondary)] border-b border-zinc-800/40 pb-2">
                          Détails du Bulletins de Paie
                        </h3>
                        <div className="flex flex-col gap-2.5 text-sm">
                          <div className="flex justify-between items-center text-[var(--color-text-secondary)]">
                            <span>Salaire Brut Initial :</span>
                            <span className="font-mono text-[var(--color-text-primary)]">{formatAr(brutToNetResult.salaireBrut)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[var(--color-text-secondary)]">
                            <span>Retenue CNaPS Salarié (1%) :</span>
                            <span className="font-mono text-rose-400">-{formatAr(brutToNetResult.cnaps)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[var(--color-text-secondary)]">
                            <span>Retenue OSTIE Salarié (1%) :</span>
                            <span className="font-mono text-rose-400">-{formatAr(brutToNetResult.ostie)}</span>
                          </div>
                          
                          {heuresSup > 0 && brutToNetResult.montantHeuresSupExonerees && (
                            <div className="flex justify-between items-center text-indigo-400">
                              <span>Exonération Heures Sup ({heuresSup}h) :</span>
                              <span className="font-mono font-medium">-{formatAr(brutToNetResult.montantHeuresSupExonerees)}</span>
                            </div>
                          )}

                          <div className="flex justify-between items-center font-semibold pt-1 text-[var(--color-text-secondary)] border-t border-zinc-800/40">
                            <span>Assiette / Base Imposable :</span>
                            <span className="font-mono text-purple-400">{formatAr(brutToNetResult.baseImposable)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[var(--color-text-secondary)]">
                            <span>IRSA Brut progressif :</span>
                            <span className="font-mono">{formatAr(brutToNetResult.irsaBrut)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[var(--color-text-secondary)]">
                            <span>Réduction charges de famille ({personnesCharge}) :</span>
                            <span className="font-mono text-emerald-400">-{formatAr(brutToNetResult.reductionCharge)}</span>
                          </div>
                          <div className="flex justify-between items-center font-bold text-sm text-[var(--color-text-secondary)] border-t border-zinc-800/40 pt-2">
                            <span>Taux d'imposition effectif :</span>
                            <span className="font-mono text-[var(--color-accent-violet)]">{brutToNetResult.tauxEffectif}%</span>
                          </div>
                        </div>

                        {/* Visual progress bar breakdown */}
                        <div className="pt-4 border-t border-zinc-800/40">
                          <TrancheVisualizer
                            id="tranche-viz-1"
                            baseImposable={brutToNetResult.baseImposable}
                            detailTranches={brutToNetResult.detailTranches}
                          />
                        </div>

                        {/* Export actions */}
                        <div className="flex items-center gap-3 pt-4 mt-2 border-t border-zinc-800/40 flex-wrap">
                          <button
                            onClick={() => handleCopySummary(brutToNetResult, "Brut vers Net")}
                            className="px-4 py-2 bg-[var(--color-bg-input)] hover:bg-zinc-800 border border-[var(--color-border-subtle)] rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer"
                          >
                            <Copy className="w-4 h-4 text-purple-400" /> Copier le texte
                          </button>
                          <button
                            onClick={() => handleExportPDF(brutToNetResult, "Simulations Classique Brut vers Net")}
                            className="px-4 py-2 bg-[#7C3AED]/15 hover:bg-[#7C3AED]/25 border border-[#7C3AED]/30 text-purple-400 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer"
                          >
                            <FileText className="w-4 h-4" /> Exporter PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Results: MODE 2 NET TO BRUT */}
                  {calcMode === TypeCalcul.NET_VERS_BRUT && netToBrutResult && (
                    <div className="flex flex-col gap-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ResultCard
                          id="result-brut-needed"
                          label="Salaire Brut Requis"
                          value={netToBrutResult.salaireBrut}
                          icon="TrendingUp"
                          type="info"
                          description="Salaire de base à inscrire sur le contrat"
                        />
                        <ResultCard
                          id="result-irsa-needed"
                          label="IRSA Retenu"
                          value={netToBrutResult.irsaFinal}
                          icon="Award"
                          type="irsa"
                          description="Retenue fiscale progressive correspondante"
                        />
                      </div>

                      {/* Intermediate Details */}
                      <div className="glass-panel p-6 flex flex-col gap-4">
                        <h3 className="text-sm font-display font-bold uppercase tracking-wider text-[var(--color-text-secondary)] border-b border-zinc-800/40 pb-2">
                          Vérification du Calcul Inverse
                        </h3>
                        <div className="flex flex-col gap-2.5 text-sm">
                          <div className="flex justify-between items-center text-[var(--color-text-secondary)]">
                            <span>Salaire Brut Identifié :</span>
                            <span className="font-mono text-[var(--color-text-primary)]">{formatAr(netToBrutResult.salaireBrut)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[var(--color-text-secondary)]">
                            <span>Retenue CNaPS Salarié (1%) :</span>
                            <span className="font-mono text-rose-400">-{formatAr(netToBrutResult.cnaps)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[var(--color-text-secondary)]">
                            <span>Retenue OSTIE Salarié (1%) :</span>
                            <span className="font-mono text-rose-400">-{formatAr(netToBrutResult.ostie)}</span>
                          </div>
                          <div className="flex justify-between items-center font-semibold pt-1 text-[var(--color-text-secondary)] border-t border-zinc-800/40">
                            <span>Base Imposable Déduite :</span>
                            <span className="font-mono text-purple-400">{formatAr(netToBrutResult.baseImposable)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[var(--color-text-secondary)]">
                            <span>IRSA Net Final :</span>
                            <span className="font-mono text-rose-400">-{formatAr(netToBrutResult.irsaFinal)}</span>
                          </div>
                          <div className="flex justify-between items-center font-bold text-sm text-[var(--color-text-secondary)] border-t border-zinc-800/40 pt-2">
                            <span>Salaire Net Souhaité (Cible) :</span>
                            <span className="font-mono text-[#10B981]">{formatAr(netToBrutResult.salaireNet)}</span>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-zinc-800/40">
                          <TrancheVisualizer
                            id="tranche-viz-2"
                            baseImposable={netToBrutResult.baseImposable}
                            detailTranches={netToBrutResult.detailTranches}
                          />
                        </div>

                        <div className="flex items-center gap-3 pt-4 mt-2 border-t border-zinc-800/40 flex-wrap">
                          <button
                            onClick={() => handleCopySummary(netToBrutResult, "Net vers Brut")}
                            className="px-4 py-2 bg-[var(--color-bg-input)] hover:bg-zinc-800 border border-[var(--color-border-subtle)] rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer"
                          >
                            <Copy className="w-4 h-4 text-purple-400" /> Copier le texte
                          </button>
                          <button
                            onClick={() => handleExportPDF(netToBrutResult, "Simulation Inverse Net vers Brut")}
                            className="px-4 py-2 bg-[#7C3AED]/15 hover:bg-[#7C3AED]/25 border border-[#7C3AED]/30 text-purple-400 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer"
                          >
                            <FileText className="w-4 h-4" /> Exporter PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Results: MODE 3 SIMULATION ANNUELLE */}
                  {calcMode === TypeCalcul.SIMULATION_ANNUELLE && simulationResult && (
                    <div className="flex flex-col gap-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ResultCard
                          id="result-annuel-brut"
                          label="Brut Total Annuel"
                          value={simulationResult.annuel.salaireBrut}
                          icon="TrendingUp"
                          type="info"
                          description="Cumul des revenus bruts sur 12/13 mois"
                        />
                        <ResultCard
                          id="result-annuel-net"
                          label="Net Cumulé Reçu"
                          value={simulationResult.annuel.salaireNet}
                          icon="TrendingUp"
                          type="success"
                          description="Ressources nettes totales encaissées"
                        />
                      </div>

                      {/* Custom SVG Bar Chart showing month by month breakdown */}
                      <div className="glass-panel p-6 flex flex-col gap-4">
                        <h3 className="text-sm font-display font-bold uppercase tracking-wider text-[var(--color-text-secondary)] border-b border-zinc-800/40 pb-2">
                          Visualisation Comparée Mensuelle (Brut vs Net)
                        </h3>

                        {/* SVG Drawing */}
                        <div className="relative w-full pt-1">
                          <svg viewBox="0 0 550 180" className="w-full h-44 bg-black/10 rounded-xl overflow-visible p-2">
                            {/* Horizontal grid lines */}
                            <line x1="40" y1="20" x2="520" y2="20" stroke="rgba(255,255,255,0.04)" strokeDasharray="3,3" />
                            <line x1="40" y1="75" x2="520" y2="75" stroke="rgba(255,255,255,0.04)" strokeDasharray="3,3" />
                            <line x1="40" y1="130" x2="520" y2="130" stroke="rgba(255,255,255,0.04)" strokeDasharray="3,3" />
                            <line x1="40" y1="150" x2="520" y2="150" stroke="rgba(255,255,255,0.1)" />

                            {/* Render columns for months */}
                            {monthlyData.map((d, idx) => {
                              const colWidth = 32;
                              const startX = 45 + idx * (colWidth + 5);
                              
                              // Scale bars
                              const brutHeight = (d.brut / chartMax) * 120;
                              const netHeight = (d.net / chartMax) * 120;
                              
                              const brutY = 150 - brutHeight;
                              const netY = 150 - netHeight;

                              const isHovered = hoveredChartMonth === idx;

                              return (
                                <g
                                  key={idx}
                                  onMouseEnter={() => setHoveredChartMonth(idx)}
                                  onMouseLeave={() => setHoveredChartMonth(null)}
                                  className="cursor-pointer"
                                >
                                  {/* Hover overlay column background */}
                                  <rect
                                    x={startX - 2}
                                    y="10"
                                    width={colWidth + 4}
                                    height="145"
                                    fill={isHovered ? 'rgba(124, 58, 237, 0.05)' : 'transparent'}
                                    rx="4"
                                    className="transition-all duration-150"
                                  />

                                  {/* Gross Bar (Purple) */}
                                  <rect
                                    x={startX}
                                    y={brutY}
                                    width={colWidth / 2 - 1}
                                    height={brutHeight}
                                    fill="url(#purpleGrad)"
                                    rx="2"
                                  />

                                  {/* Net Bar (Green) */}
                                  <rect
                                    x={startX + colWidth / 2 + 1}
                                    y={netY}
                                    width={colWidth / 2 - 1}
                                    height={netHeight}
                                    fill="url(#greenGrad)"
                                    rx="2"
                                  />

                                  {/* Labels */}
                                  <text
                                    x={startX + colWidth / 2}
                                    y="165"
                                    textAnchor="middle"
                                    className="text-[9px] fill-zinc-400 font-mono"
                                  >
                                    {idx === 12 ? '13e' : `M${idx + 1}`}
                                  </text>
                                </g>
                              );
                            })}

                            {/* Gradients definitions */}
                            <defs>
                              <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.8" />
                                <stop offset="100%" stopColor="#6366F1" stopOpacity="0.3" />
                              </linearGradient>
                              <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
                                <stop offset="100%" stopColor="#059669" stopOpacity="0.3" />
                              </linearGradient>
                            </defs>
                          </svg>

                          {/* Hover details box */}
                          <div className="h-10 mt-2 flex items-center justify-center text-xs text-[var(--color-text-secondary)] font-mono border border-[var(--color-border-subtle)] rounded-lg bg-[var(--color-bg-input)] px-4">
                            {hoveredChartMonth !== null ? (
                              <div className="flex gap-4">
                                <span className="font-semibold text-white">{monthlyData[hoveredChartMonth].label} :</span>
                                <span>Brut: <b className="text-[#C084FC]">{formatAr(monthlyData[hoveredChartMonth].brut)}</b></span>
                                <span>Net: <b className="text-[#10B981]">{formatAr(monthlyData[hoveredChartMonth].net)}</b></span>
                                <span>Impôt: <b className="text-rose-400">{formatAr(monthlyData[hoveredChartMonth].irsa)}</b></span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-[var(--color-text-muted)] animate-pulse-slow">
                                Survolez une colonne du graphique pour voir le détail mensuel
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Annual Summary Table Breakdown */}
                        <div className="flex flex-col gap-2 pt-3 border-t border-zinc-800/40 text-sm">
                          <div className="flex justify-between items-center text-[var(--color-text-secondary)]">
                            <span>Salaire Mensuel Brut :</span>
                            <span className="font-mono text-white">{formatAr(simulationResult.mensuel.salaireBrut)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[var(--color-text-secondary)]">
                            <span>IRSA Mensuel Net :</span>
                            <span className="font-mono text-rose-400">-{formatAr(simulationResult.mensuel.irsaFinal)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[var(--color-text-secondary)]">
                            <span>Impôt cumulé total annuel :</span>
                            <span className="font-mono text-rose-400">-{formatAr(simulationResult.annuel.irsaTotal)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[var(--color-text-secondary)]">
                            <span>Charges CNaPS + Santé annuelles :</span>
                            <span className="font-mono">-{formatAr(simulationResult.annuel.cnaps + simulationResult.annuel.ostie)}</span>
                          </div>
                          <div className="flex justify-between items-center font-bold text-sm text-[var(--color-text-secondary)] border-t border-zinc-800/40 pt-2 text-[#10B981]">
                            <span>Revenu Net Annuel Final :</span>
                            <span className="font-mono">{formatAr(simulationResult.annuel.salaireNet)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Results: MODE 4 COMPARATIVE */}
                  {calcMode === TypeCalcul.COMPARAISON && comparaisonResult && (
                    <div className="flex flex-col gap-6">
                      {/* Grid comparison results */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="glass-panel p-5 border-l-4 border-l-purple-500">
                          <p className="text-[10px] uppercase font-bold text-[var(--color-text-muted)]">Salaire Option A</p>
                          <h4 className="text-xl font-bold font-mono text-white mt-1">{formatAr(comparaisonResult.salaire1.salaireBrut)}</h4>
                          <div className="mt-3 text-xs flex flex-col gap-1 text-[var(--color-text-secondary)]">
                            <div className="flex justify-between">
                              <span>Net :</span>
                              <span className="font-bold text-[#10B981]">{formatAr(comparaisonResult.salaire1.salaireNet)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Impôt :</span>
                              <span className="text-rose-400">{formatAr(comparaisonResult.salaire1.irsaFinal)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Taux eff. :</span>
                              <span>{comparaisonResult.salaire1.tauxEffectif}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="glass-panel p-5 border-l-4 border-l-indigo-500">
                          <p className="text-[10px] uppercase font-bold text-[var(--color-text-muted)]">Salaire Option B</p>
                          <h4 className="text-xl font-bold font-mono text-white mt-1">{formatAr(comparaisonResult.salaire2.salaireBrut)}</h4>
                          <div className="mt-3 text-xs flex flex-col gap-1 text-[var(--color-text-secondary)]">
                            <div className="flex justify-between">
                              <span>Net :</span>
                              <span className="font-bold text-[#10B981]">{formatAr(comparaisonResult.salaire2.salaireNet)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Impôt :</span>
                              <span className="text-rose-400">{formatAr(comparaisonResult.salaire2.irsaFinal)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Taux eff. :</span>
                              <span>{comparaisonResult.salaire2.tauxEffectif}%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Disparity Summary card */}
                      <div className="glass-panel p-6 flex flex-col gap-4">
                        <h3 className="text-sm font-display font-bold uppercase tracking-wider text-[var(--color-text-secondary)] border-b border-zinc-800/40 pb-2">
                          Analyse Comparative (Écart B - A)
                        </h3>

                        <div className="flex flex-col gap-3 text-sm">
                          <div className="flex justify-between items-center text-[var(--color-text-secondary)]">
                            <span>Écart de Salaire Brut :</span>
                            <span className={`font-mono font-bold ${comparaisonResult.differences.salaireBrut >= 0 ? 'text-[#C084FC]' : 'text-rose-400'}`}>
                              {comparaisonResult.differences.salaireBrut >= 0 ? '+' : ''}{formatAr(comparaisonResult.differences.salaireBrut)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[var(--color-text-secondary)]">
                            <span>Différence de Rétention IRSA :</span>
                            <span className={`font-mono font-bold ${comparaisonResult.differences.irsa >= 0 ? 'text-rose-400' : 'text-[#10B981]'}`}>
                              {comparaisonResult.differences.irsa >= 0 ? '+' : ''}{formatAr(comparaisonResult.differences.irsa)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[var(--color-text-secondary)]">
                            <span>Différence de Taux Taxation :</span>
                            <span className="font-mono font-semibold">
                              {comparaisonResult.differences.tauxEffectif >= 0 ? '+' : ''}{comparaisonResult.differences.tauxEffectif}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center font-bold text-sm text-[var(--color-text-secondary)] border-t border-zinc-800/40 pt-2 text-[#10B981]">
                            <span>Gain Net Réel Additionnel :</span>
                            <span className="font-mono">
                              {comparaisonResult.differences.salaireNet >= 0 ? '+' : ''}{formatAr(comparaisonResult.differences.salaireNet)}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-input)] p-3 rounded-lg border border-[var(--color-border-subtle)] mt-1">
                          En augmentant le salaire de {formatAr(comparaisonResult.differences.salaireBrut)}, l'administration fiscale retient {formatAr(comparaisonResult.differences.irsa)} d'IRSA supplémentaire par mois, vous laissant un gain net additionnel réel de {formatAr(comparaisonResult.differences.salaireNet)}.
                        </p>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </motion.div>
          )}

          {/* PAGE 3: GUIDE MANUAL SCREEN */}
          {currentPage === 'guide' && (
            <motion.div
              key="guide"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-8 max-w-4xl mx-auto"
            >
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-extrabold tracking-tight">Guide Fiscal Officiel de l'IRSA Madagascar</h1>
                <p className="text-xs text-[var(--color-text-secondary)]">Comprendre la méthode de calcul légale pas à pas conforme au CGI</p>
              </div>

              {/* Step by step example segment */}
              <div className="glass-panel p-6 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-purple-400">
                  <Sparkles className="w-5 h-5 animate-pulse-slow" />
                  <h3 className="font-display font-semibold text-base">Méthode de Calcul Légale Pas à Pas (Art. 01.03.10)</h3>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  L'IRSA est un impôt assis sur les salaires, traitements, indemnités, émols et autres gains à Madagascar. Voici le processus officiel de retenue à la source pratiqué par les services RH :
                </p>

                <div className="flex flex-col gap-4 mt-2">
                  <div className="p-4 rounded-xl bg-[var(--color-bg-input)] border border-[var(--color-border-subtle)]">
                    <h4 className="text-xs uppercase tracking-wider font-bold text-[#C084FC] mb-2">Étape 1 : Retenir les cotisations sociales obligatoires</h4>
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      L'employeur retient d'abord la CNaPS (1% salarié) et l'OSTIE (1% en moyenne). Ces deux éléments sont calculés sur le salaire brut, mais sont limités mensuellement par un plafond légal égal à 8 fois le SME de l'année ({formatAr(262680 * 8)} pour 2026).
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[var(--color-bg-input)] border border-[var(--color-border-subtle)]">
                    <h4 className="text-xs uppercase tracking-wider font-bold text-[#C084FC] mb-2">Étape 2 : Déduire les heures supp. et arrondir la Base Imposable</h4>
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      Les heures supplémentaires validées sont défiscalisées dans la limite de 20 heures par mois et soustraites du salaire de base. L'assiette imposable ainsi déduite doit réglementairement être <b>arrondie à la centaine inférieure</b> (ex: 784 153 Ar devient 784 100 Ar) avant d'appliquer le barème.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[var(--color-bg-input)] border border-[var(--color-border-subtle)]">
                    <h4 className="text-xs uppercase tracking-wider font-bold text-[#C084FC] mb-2">Étape 3 : Appliquer le Barème Progressif 2026</h4>
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      L'assiette imposable est soumise à des taux progressifs par paliers cumulatifs :
                      <br />• Jusqu'à 350 000 Ar : <b>Exonéré (0%)</b>
                      <br />• De 350 001 à 400 000 Ar : <b>5%</b>
                      <br />• De 400 001 à 500 000 Ar : <b>10%</b>
                      <br />• De 500 001 à 600 000 Ar : <b>15%</b>
                      <br />• De 600 001 à 4 000 000 Ar : <b>20%</b>
                      <br />• Au-delà de 4 000 000 Ar : <b>25%</b>
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[var(--color-bg-input)] border border-[var(--color-border-subtle)]">
                    <h4 className="text-xs uppercase tracking-wider font-bold text-[#C084FC] mb-2">Étape 4 : Déduire les réductions familiales et imposer le plancher</h4>
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      Une réduction directe de 2 000 Ar par personne à charge est déduite de l'impôt brut trouvé. Si l'impôt final descend sous 3 000 Ar par mois, le <b>minimum légal de perception de 3 000 Ar</b> est applicable d'office pour tout salarié imposable.
                    </p>
                  </div>
                </div>
              </div>

              {/* FAQ Section */}
              <div className="flex flex-col gap-4">
                <h3 className="font-display font-semibold text-lg border-b border-zinc-800/40 pb-2">
                  Foire Aux Questions (FAQ IRSA)
                </h3>
                <FaqAccordion />
              </div>

              {/* External references and credits */}
              <div className="glass-panel p-5 flex items-center justify-between text-xs text-[var(--color-text-secondary)] flex-wrap gap-4">
                <div className="flex gap-2 items-center">
                  <Info className="w-4 h-4 text-purple-400" />
                  <span>Sources documentaires : Code Général des Impôts (CGI) - Direction Générale des Impôts de Madagascar.</span>
                </div>
                <a
                  href="http://www.impots.mg/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--color-accent-violet)] font-bold flex items-center gap-1 hover:underline"
                >
                  Visiter DGI <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </motion.div>
          )}

          {/* PAGE 4: USER HISTORIQUE SCREEN */}
          {currentPage === 'historique' && (
            <motion.div
              key="historique"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-6"
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-display font-extrabold tracking-tight">Mon Historique de Calculs</h1>
                  <p className="text-xs text-[var(--color-text-secondary)]">Calculs enregistrés de manière anonyme dans ce navigateur</p>
                </div>
                
                {userHistory.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Effacer tout l'historique
                  </button>
                )}
              </div>

              {/* History list box */}
              {isLoadingHistory ? (
                <div className="glass-panel p-12 text-center text-zinc-400 animate-pulse-slow font-mono text-sm">
                  Chargement de l'historique de session...
                </div>
              ) : userHistory.length === 0 ? (
                <div className="glass-panel p-12 text-center flex flex-col items-center gap-4 max-w-lg mx-auto">
                  <div className="w-12 h-12 rounded-xl bg-zinc-800/50 text-zinc-500 flex items-center justify-center">
                    <History className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-base mb-1">Aucun calcul enregistré</h3>
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      Vos simulations de calculs de paie apparaîtront ici automatiquement. Votre historique est stocké en local dans votre navigateur.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setCalcMode(TypeCalcul.BRUT_VERS_NET);
                      setCurrentPage('calculateur');
                    }}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white rounded-xl cursor-pointer"
                  >
                    Faire un premier calcul
                  </button>
                </div>
              ) : (
                <div className="glass-panel p-6 flex flex-col gap-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-muted)] font-display uppercase text-[10px] tracking-wider">
                          <th className="pb-3 font-semibold">Date</th>
                          <th className="pb-3 font-semibold">Type de Calcul</th>
                          <th className="pb-3 font-semibold">Salaire Brut</th>
                          <th className="pb-3 font-semibold">Impôt IRSA</th>
                          <th className="pb-3 font-semibold">Net Perçu</th>
                          <th className="pb-3 font-semibold">Taux eff.</th>
                          <th className="pb-3 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/40">
                        {userHistory.map((h) => (
                          <tr key={h.id} className="hover:bg-[var(--color-bg-input)] transition-colors group">
                            <td className="py-4 font-mono text-xs text-[var(--color-text-secondary)]">
                              {new Date(h.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-4 font-medium">
                              {h.typeCalcul === TypeCalcul.BRUT_VERS_NET && (
                                <span className="text-purple-400 text-xs font-semibold">Brut vers Net</span>
                              )}
                              {h.typeCalcul === TypeCalcul.NET_VERS_BRUT && (
                                <span className="text-emerald-400 text-xs font-semibold">Net vers Brut</span>
                              )}
                              {h.typeCalcul === TypeCalcul.SIMULATION_ANNUELLE && (
                                <span className="text-indigo-400 text-xs font-semibold">Simulation Annuelle</span>
                              )}
                              {h.typeCalcul === TypeCalcul.COMPARAISON && (
                                <span className="text-amber-400 text-xs font-semibold">Comparaison</span>
                              )}
                            </td>
                            <td className="py-4 font-mono font-medium">
                              {h.salaireBrut ? formatAr(h.salaireBrut) : '-'}
                            </td>
                            <td className="py-4 font-mono text-rose-400 font-semibold">
                              {formatAr(h.irsaCalcule)}
                            </td>
                            <td className="py-4 font-mono text-[#10B981] font-bold">
                              {formatAr(h.salaireNetFinal)}
                            </td>
                            <td className="py-4 font-mono text-xs text-[var(--color-text-secondary)]">
                              {h.tauxEffectif}%
                            </td>
                            <td className="py-4 text-right">
                              <button
                                onClick={() => handleRecallHistory(h)}
                                className="px-3 py-1.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-primary)] hover:border-purple-500/50 hover:text-white transition-colors text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                              >
                                Charger <ArrowRight className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-2 mt-2">
                    <Info className="w-4 h-4" />
                    Votre historique est stocké anonymement et lié uniquement à ce navigateur. Il permet d'agréger les données de salaire moyennes pour la communauté.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* PAGE 5: ADMIN / BARÈME UPDATE SCREEN */}
          {currentPage === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-6 max-w-4xl mx-auto"
            >
              {!isAdminAuthenticated ? (
                // Authentication Screen
                <div className="glass-panel p-8 max-w-md mx-auto w-full flex flex-col gap-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[#7C3AED]/15 text-[#7C3AED] flex items-center justify-center mx-auto shadow-lg shadow-purple-500/10">
                    <Lock className="w-8 h-8" />
                  </div>
                  <div>
                    <h1 className="text-xl font-display font-extrabold tracking-tight text-white">Administration du Barème</h1>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                      Accédez à la configuration en direct de la grille d'imposition IRSA, du SME et des réductions familiales.
                    </p>
                  </div>

                  <form onSubmit={handleAdminLogin} className="flex flex-col gap-4 text-left">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs uppercase tracking-wider text-[var(--color-text-secondary)] font-semibold">
                        Mot de passe d'administration
                      </label>
                      <input
                        type="password"
                        placeholder="Ex: irsa-admin-2026"
                        value={adminTokenInput}
                        onChange={(e) => setAdminTokenInput(e.target.value)}
                        className="w-full h-12 px-4 bg-white/5 dark:bg-white/5 border border-white/10 focus:border-[#7C3AED]/50 focus:ring-2 focus:ring-[#7C3AED]/20 focus:outline-none rounded-xl text-lg font-mono text-white transition-all"
                      />
                    </div>

                    {adminError && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{adminError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-lg shadow-purple-500/25 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? "Vérification..." : (
                        <>
                          Déverrouiller le portail <Unlock className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                  <p className="text-[10px] text-[var(--color-text-muted)] italic">
                    Astuce : Le mot de passe par défaut est <code className="bg-white/5 px-1 py-0.5 rounded font-mono">irsa-admin-2026</code>.
                  </p>
                </div>
              ) : (
                // Barème Management Dashboard
                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[var(--color-border-subtle)] pb-4">
                    <div>
                      <h1 className="text-2xl md:text-3xl font-display font-extrabold tracking-tight">Grille Administrative du Barème</h1>
                      <p className="text-xs text-[var(--color-text-secondary)]">Modifiez et activez les paramètres légaux en temps réel</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleAdminLogout}
                        className="px-4 py-2 border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                      >
                        Fermer la session
                      </button>
                    </div>
                  </div>

                  {adminBareme && (
                    <form onSubmit={handleSaveBareme} className="flex flex-col gap-6">
                      
                      {/* Globals parameters section */}
                      <div className="glass-panel p-6 flex flex-col gap-5">
                        <h3 className="font-display font-semibold text-base text-[#C084FC] border-b border-zinc-800/40 pb-2">
                          1. Constantes & Seuils de Référence
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs uppercase tracking-wider text-[var(--color-text-secondary)] font-semibold">
                              Année du Barème
                            </label>
                            <input
                              type="number"
                              value={adminBareme.annee}
                              onChange={(e) => setAdminBareme({ ...adminBareme, annee: Number(e.target.value) })}
                              className="w-full h-11 px-3 bg-white/5 border border-white/10 focus:border-[#7C3AED]/50 rounded-xl text-sm font-mono font-bold text-white focus:outline-none"
                              required
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs uppercase tracking-wider text-[var(--color-text-secondary)] font-semibold">
                              SME Mensuel (Ar)
                            </label>
                            <input
                              type="number"
                              value={adminBareme.sme}
                              onChange={(e) => setAdminBareme({ ...adminBareme, sme: Number(e.target.value) })}
                              className="w-full h-11 px-3 bg-white/5 border border-white/10 focus:border-[#7C3AED]/50 rounded-xl text-sm font-mono font-bold text-white focus:outline-none"
                              required
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs uppercase tracking-wider text-[var(--color-text-secondary)] font-semibold">
                              Déduction par Enfant/Conjoint
                            </label>
                            <input
                              type="number"
                              value={adminBareme.reductionCharge}
                              onChange={(e) => setAdminBareme({ ...adminBareme, reductionCharge: Number(e.target.value) })}
                              className="w-full h-11 px-3 bg-white/5 border border-white/10 focus:border-[#7C3AED]/50 rounded-xl text-sm font-mono font-bold text-white focus:outline-none"
                              required
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs uppercase tracking-wider text-[var(--color-text-secondary)] font-semibold">
                              Impôt Minimum Perçu
                            </label>
                            <input
                              type="number"
                              value={adminBareme.minimumPerception}
                              onChange={(e) => setAdminBareme({ ...adminBareme, minimumPerception: Number(e.target.value) })}
                              className="w-full h-11 px-3 bg-white/5 border border-white/10 focus:border-[#7C3AED]/50 rounded-xl text-sm font-mono font-bold text-white focus:outline-none"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-input)] p-4 rounded-xl border border-[var(--color-border-subtle)] mt-2">
                          <p>• Les charges CNaPS et OSTIE (1%) sont calculées sur le salaire brut réel.</p>
                          <p>• Le plafond maximal des charges CNaPS/OSTIE est égal à 8 fois le SME saisi ci-dessus.</p>
                          <p>• Les heures supplémentaires sont exonérées d'impôts IRSA de base dans la limite de 20 heures.</p>
                        </div>
                      </div>

                      {/* Tranches layout segment */}
                      <div className="glass-panel p-6 flex flex-col gap-4">
                        <h3 className="font-display font-semibold text-base text-[#C084FC] border-b border-zinc-800/40 pb-2">
                          2. Tranches d'Imposition Progressives de l'IRSA
                        </h3>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead>
                              <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-muted)] font-display uppercase text-[10px] tracking-wider">
                                <th className="pb-3 font-semibold">Palier</th>
                                <th className="pb-3 font-semibold">Seuil Minimal (Ar)</th>
                                <th className="pb-3 font-semibold">Seuil Maximal (Ar)</th>
                                <th className="pb-3 font-semibold text-right">Taux (%)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/40">
                              {adminBareme.tranches.map((t, idx) => (
                                <tr key={idx} className="hover:bg-[var(--color-bg-input)] transition-colors">
                                  <td className="py-3 font-medium align-middle">
                                    Tranche {idx + 1}
                                  </td>
                                  <td className="py-2 pr-4 align-middle">
                                    <input
                                      type="number"
                                      value={t.min}
                                      onChange={(e) => handleUpdateTranche(idx, 'min', Number(e.target.value))}
                                      className="h-10 w-full px-2.5 bg-white/5 border border-white/10 focus:border-[#7C3AED]/50 rounded-lg text-xs font-mono text-white focus:outline-none"
                                      required
                                    />
                                  </td>
                                  <td className="py-2 pr-4 align-middle">
                                    {t.max === 999999999 ? (
                                      <div className="flex items-center justify-between h-10 px-2.5 bg-zinc-800/40 border border-white/5 text-zinc-500 rounded-lg text-xs font-mono">
                                        <span>Sans limite (+)</span>
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateTranche(idx, 'max', 5000000)}
                                          className="text-purple-400 hover:underline text-[10px]"
                                        >
                                          Définir limite
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="relative">
                                        <input
                                          type="number"
                                          value={t.max}
                                          onChange={(e) => handleUpdateTranche(idx, 'max', Number(e.target.value))}
                                          className="h-10 w-full px-2.5 bg-white/5 border border-white/10 focus:border-[#7C3AED]/50 rounded-lg text-xs font-mono text-white focus:outline-none pr-16"
                                          required
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateTranche(idx, 'max', 999999999)}
                                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 hover:text-white bg-zinc-800 px-1.5 py-0.5 rounded border border-white/10"
                                        >
                                          Infini
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2 align-middle text-right">
                                    <div className="inline-flex items-center relative">
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={Math.round(t.taux * 100 * 10) / 10}
                                        onChange={(e) => handleUpdateTranche(idx, 'taux', Number(e.target.value) / 100)}
                                        className="h-10 w-24 px-2.5 bg-white/5 border border-white/10 focus:border-[#7C3AED]/50 rounded-lg text-right font-mono text-white focus:outline-none pr-6 font-bold"
                                        required
                                      />
                                      <span className="absolute right-2 text-zinc-400 font-bold text-xs">%</span>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {adminError && (
                        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 shrink-0" />
                          <span>{adminError}</span>
                        </div>
                      )}

                      {/* Form Actions */}
                      <div className="flex items-center gap-4 justify-end">
                        <button
                          type="button"
                          onClick={() => setCurrentPage('home')}
                          className="px-6 h-12 border border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[var(--color-bg-input)] transition-all cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingBareme}
                          className="px-8 h-12 bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white font-semibold rounded-xl flex items-center gap-2 hover:opacity-95 transition-all shadow-lg shadow-purple-500/25 cursor-pointer disabled:opacity-50"
                        >
                          {isSavingBareme ? "Enregistrement..." : (
                            <>
                              Enregistrer et Activer le Barème <Save className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>

                    </form>
                  )}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Persistent Beautiful Footer */}
      <footer className="w-full mt-12 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-primary)] py-8 transition-colors">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[var(--color-text-secondary)]">
          <div className="flex flex-col gap-1 text-center md:text-left">
            <p className="font-display font-bold text-white">IRSA Madagascar © 2026</p>
            <p className="font-light">Outil indépendant d'aide au calcul et de simulation fiscale.</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setCurrentPage('guide')} className="hover:text-white transition-colors cursor-pointer">CGI République de Madagascar</button>
            <span className="text-zinc-700">|</span>
            <button onClick={() => setCurrentPage('admin')} className="hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1">
              <Settings className="w-3.5 h-3.5" /> Administration
            </button>
            <span className="text-zinc-700">|</span>
            <button onClick={() => setCurrentPage('calculateur')} className="hover:text-white transition-colors cursor-pointer">Calculateur en ligne</button>
          </div>
        </div>
      </footer>

      {/* Sticky Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0F]/85 backdrop-blur-xl border-t border-white/5 px-2 py-2 flex justify-around items-center shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <button
          onClick={() => setCurrentPage('home')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
            currentPage === 'home'
              ? 'text-[#C084FC]'
              : 'text-[var(--color-text-secondary)]/70 hover:text-white'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[9px] font-medium font-display uppercase tracking-wider">Accueil</span>
        </button>

        <button
          onClick={() => setCurrentPage('calculateur')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
            currentPage === 'calculateur'
              ? 'text-[#C084FC]'
              : 'text-[var(--color-text-secondary)]/70 hover:text-white'
          }`}
        >
          <Calculator className="w-5 h-5" />
          <span className="text-[9px] font-medium font-display uppercase tracking-wider">Calcul</span>
        </button>

        <button
          onClick={() => setCurrentPage('guide')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
            currentPage === 'guide'
              ? 'text-[#C084FC]'
              : 'text-[var(--color-text-secondary)]/70 hover:text-white'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[9px] font-medium font-display uppercase tracking-wider">Guide</span>
        </button>

        <button
          onClick={() => setCurrentPage('historique')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
            currentPage === 'historique'
              ? 'text-[#C084FC]'
              : 'text-[var(--color-text-secondary)]/70 hover:text-white'
          }`}
        >
          <History className="w-5 h-5" />
          <span className="text-[9px] font-medium font-display uppercase tracking-wider">Historique</span>
        </button>

        <button
          onClick={() => setCurrentPage('admin')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
            currentPage === 'admin'
              ? 'text-[#C084FC]'
              : 'text-[var(--color-text-secondary)]/70 hover:text-white'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[9px] font-medium font-display uppercase tracking-wider">Barème</span>
        </button>
      </div>

      {/* Floating Interactive Toast Feedback Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border border-[var(--color-border-subtle)] bg-[#101018]/90 text-[var(--color-text-primary)] text-sm shadow-2xl flex items-center gap-2 max-w-sm"
          >
            <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Check className="w-3.5 h-3.5" />
            </div>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
