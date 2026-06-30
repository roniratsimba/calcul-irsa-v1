import React, { useState, useEffect } from 'react';
import { Calculator, Info, MessageSquare, Moon, Sun } from 'lucide-react';
import { calculerIRSA, IRSAResultat } from './irsaCalculator';

type TabType = 'calculator' | 'guide' | 'feedback';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('calculator');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Calculator state
  const [salaireBrut, setSalaireBrut] = useState<number>(500000);
  const [avecSanitaire, setAvecSanitaire] = useState<boolean>(true);
  const [nombreEnfants, setNombreEnfants] = useState<number>(0);
  const [resultat, setResultat] = useState<IRSAResultat | null>(null);

  // Feedback form state
  const [feedbackName, setFeedbackName] = useState<string>('');
  const [feedbackEmail, setFeedbackEmail] = useState<string>('');
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);

  // Theme management
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.remove('light');
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [isDarkMode]);

  const handleCalcul = () => {
    const cnaps = salaireBrut * 0.01; // 1% fixe
    const sanitaire = avecSanitaire ? salaireBrut * 0.01 : 0; // 1% si applicable
    const result = calculerIRSA(salaireBrut, cnaps, sanitaire, nombreEnfants);
    setResultat(result);
  };

  const formatAr = (num: number) => {
    return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' Ar';
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    try {
      const response = await fetch('https://formspree.io/f/xpqgjgnq', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        setFeedbackSubmitted(true);
        setTimeout(() => {
          setFeedbackSubmitted(false);
          setFeedbackName('');
          setFeedbackEmail('');
          setFeedbackMessage('');
        }, 6000);
      } else {
        alert('Une erreur est survenue lors de l\'envoi du message. Veuillez réessayer.');
      }
    } catch (error) {
      alert('Une erreur est survenue lors de l\'envoi du message. Veuillez réessayer.');
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' : 'bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50'} ${isDarkMode ? 'text-white' : 'text-slate-900'} transition-colors duration-300`}>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Calculateur IRSA Madagascar
            </h1>
          </div>
          <p className={`text-sm md:text-base ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Conforme à la Loi de Finances 2026
          </p>
        </div>

        {/* Navigation */}
        <nav className={`mb-8 rounded-2xl p-2 ${isDarkMode ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white/80 border border-slate-200/50'} backdrop-blur-sm shadow-xl`}>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('calculator')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'calculator'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span className="hidden sm:inline">Calculateur IRSA</span>
              <span className="sm:hidden">Calculateur</span>
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'guide'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Info className="w-4 h-4" />
              <span className="hidden sm:inline">Infos & Guide 2026</span>
              <span className="sm:hidden">Guide</span>
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'feedback'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Avis & Feedback</span>
              <span className="sm:hidden">Feedback</span>
            </button>
          </div>
        </nav>

        {/* Theme Toggle */}
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-3 rounded-xl ${isDarkMode ? 'bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white' : 'bg-white/80 border border-slate-200/50 text-slate-600 hover:text-slate-900'} backdrop-blur-sm transition-colors`}
            title={isDarkMode ? "Mode clair" : "Mode sombre"}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        {/* Content */}
        <main className="mb-20">
          {/* Calculator Tab */}
          {activeTab === 'calculator' && (
            <div className={`${isDarkMode ? 'bg-slate-800/50 backdrop-blur-sm border border-slate-700/50' : 'bg-white/80 backdrop-blur-sm border border-slate-200/50'} rounded-2xl p-6 md:p-8 shadow-xl`}>
              <h2 className={`text-xl font-semibold mb-6 ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>Calculateur IRSA</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Salaire Brut */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Salaire Brut (Ar)
                  </label>
                  <input
                    type="number"
                    value={salaireBrut}
                    onChange={(e) => setSalaireBrut(Number(e.target.value))}
                    className={`w-full px-4 py-3 ${isDarkMode ? 'bg-slate-900/50 border-slate-600 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'} rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all`}
                    placeholder="Ex: 500000"
                  />
                </div>

                {/* Nombre d'enfants */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Nombre d'enfants à charge
                  </label>
                  <input
                    type="number"
                    value={nombreEnfants}
                    onChange={(e) => setNombreEnfants(Number(e.target.value))}
                    min="0"
                    className={`w-full px-4 py-3 ${isDarkMode ? 'bg-slate-900/50 border-slate-600 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'} rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all`}
                    placeholder="Ex: 2"
                  />
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Réduction de 2 000 Ar par enfant</p>
                </div>

                {/* Cotisation CNaPS */}
                <div className="md:col-span-2">
                  <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-slate-900/50 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Cotisation CNaPS</p>
                        <p className={`text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>1% du salaire brut (obligatoire)</p>
                      </div>
                      <span className={`font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>{formatAr(salaireBrut * 0.01)}</span>
                    </div>
                  </div>
                </div>

                {/* Cotisation Sanitaire */}
                <div className="md:col-span-2">
                  <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-slate-900/50 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Cotisation Sanitaire (OSTIE)</p>
                        <p className={`text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>1% du salaire brut (optionnel)</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                          {avecSanitaire ? formatAr(salaireBrut * 0.01) : '0 Ar'}
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={avecSanitaire}
                            onChange={(e) => setAvecSanitaire(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCalcul}
                className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/30 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Calculer l'IRSA
              </button>

              {/* Résultats */}
              {resultat && (
                <div className="mt-8 space-y-6">
                  <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>Résultat du calcul</h3>
                  
                  {/* Résumé principal */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-xl p-5 border ${isDarkMode ? 'border-purple-500/30' : 'border-purple-500/40'}`}>
                      <p className={`text-sm mb-1 ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>Base Imposable</p>
                      <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatAr(resultat.baseImposable)}</p>
                      <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Arrondi à la centaine inf.</p>
                    </div>
                    <div className={`bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl p-5 border ${isDarkMode ? 'border-amber-500/30' : 'border-amber-500/40'}`}>
                      <p className={`text-sm mb-1 ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>IRSA Brut</p>
                      <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatAr(resultat.irsaBrut)}</p>
                    </div>
                    <div className={`bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-xl p-5 border ${isDarkMode ? 'border-emerald-500/30' : 'border-emerald-500/40'}`}>
                      <p className={`text-sm mb-1 ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>IRSA Net à Payer</p>
                      <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatAr(resultat.irsaNet)}</p>
                    </div>
                  </div>

                  {/* Détails */}
                  <div className={`rounded-xl p-5 ${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'} space-y-3`}>
                    <div className="flex justify-between items-center py-2 border-b border-slate-700">
                      <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>Salaire Brut</span>
                      <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatAr(resultat.salaireBrut)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-700">
                      <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>- Cotisation CNaPS (1%)</span>
                      <span className={`font-semibold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>-{formatAr(resultat.cnaps)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-700">
                      <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>- Cotisation Sanitaire (1%)</span>
                      <span className={`font-semibold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>-{formatAr(resultat.sanitaire)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-700">
                      <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>= Base Imposable (arrondie)</span>
                      <span className={`font-semibold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>{formatAr(resultat.baseImposable)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-700">
                      <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>IRSA Brut (progressif)</span>
                      <span className={`font-semibold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>{formatAr(resultat.irsaBrut)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-700">
                      <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>- Réduction enfants ({nombreEnfants} × 2 000 Ar)</span>
                      <span className={`font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>-{formatAr(resultat.reductionEnfants)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-700">
                      <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>= IRSA Net</span>
                      <span className={`font-semibold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{formatAr(resultat.irsaNet)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className={`font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Salaire Net Final</span>
                      <span className={`font-bold text-xl ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatAr(resultat.salaireNet)}</span>
                    </div>
                  </div>

                  {/* Détail des tranches */}
                  <div>
                    <h4 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Détail par tranches</h4>
                    <div className={`rounded-xl p-5 ${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-700">
                            <th className={`text-left py-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Tranche</th>
                            <th className={`text-right py-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Taux</th>
                            <th className={`text-right py-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Imposable</th>
                            <th className={`text-right py-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Impôt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resultat.detailTranches.map((tranche, idx) => (
                            <tr key={idx} className="border-b border-slate-800">
                              <td className={`py-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{tranche.label}</td>
                              <td className={`py-2 text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{(tranche.taux * 100).toFixed(0)}%</td>
                              <td className={`py-2 text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{formatAr(tranche.imposable)}</td>
                              <td className={`py-2 text-right font-semibold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>{formatAr(tranche.impot)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Guide Tab */}
          {activeTab === 'guide' && (
            <div className={`${isDarkMode ? 'bg-slate-800/50 backdrop-blur-sm border border-slate-700/50' : 'bg-white/80 backdrop-blur-sm border border-slate-200/50'} rounded-2xl p-6 md:p-8 shadow-xl`}>
              <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>Infos & Guide IRSA 2026</h2>
              
              <div className="space-y-8">
                {/* Barème fiscal */}
                <div>
                  <h3 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Barème Fiscal Progressif (Loi de Finances 2026)</h3>
                  <div className={`rounded-xl overflow-hidden ${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                    <table className="w-full">
                      <thead>
                        <tr className={isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}>
                          <th className={`text-left py-3 px-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Tranche</th>
                          <th className={`text-right py-3 px-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Taux</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className={`border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                          <td className={`py-3 px-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>0 à 350 000 Ar</td>
                          <td className={`py-3 px-4 text-right font-semibold text-emerald-500`}>0%</td>
                        </tr>
                        <tr className={`border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                          <td className={`py-3 px-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>350 001 à 400 000 Ar</td>
                          <td className={`py-3 px-4 text-right font-semibold text-amber-500`}>5%</td>
                        </tr>
                        <tr className={`border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                          <td className={`py-3 px-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>400 001 à 500 000 Ar</td>
                          <td className={`py-3 px-4 text-right font-semibold text-amber-500`}>10%</td>
                        </tr>
                        <tr className={`border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                          <td className={`py-3 px-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>500 001 à 600 000 Ar</td>
                          <td className={`py-3 px-4 text-right font-semibold text-amber-500`}>15%</td>
                        </tr>
                        <tr className={`border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                          <td className={`py-3 px-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>600 001 à 4 000 000 Ar</td>
                          <td className={`py-3 px-4 text-right font-semibold text-orange-500`}>20%</td>
                        </tr>
                        <tr>
                          <td className={`py-3 px-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Au-delà de 4 000 000 Ar</td>
                          <td className={`py-3 px-4 text-right font-semibold text-red-500`}>25%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Règles de calcul */}
                <div>
                  <h3 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Règles de Calcul</h3>
                  <div className={`space-y-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                      <h4 className={`font-semibold mb-2 ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>1. Base Imposable</h4>
                      <p className="text-sm">La base imposable est calculée en déduisant du salaire brut les cotisations salariales obligatoires (CNaPS 1% et, si applicable, OSTIE 1%).</p>
                    </div>
                    <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                      <h4 className={`font-semibold mb-2 ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>2. Arrondi Légal</h4>
                      <p className="text-sm">La base imposable obtenue est obligatoirement arrondie à la centaine d'Ariary inférieure. Exemple : 450 175 Ar devient 450 100 Ar.</p>
                    </div>
                    <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                      <h4 className={`font-semibold mb-2 ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>3. Impôt Progressif par Tranches</h4>
                      <p className="text-sm">L'IRSA est calculé selon un barème progressif : chaque tranche de revenu est taxée à un taux différent. Les tranches s'appliquent successivement.</p>
                    </div>
                    <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                      <h4 className={`font-semibold mb-2 ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>4. Minimum de Perception</h4>
                      <p className="text-sm">L'impôt calculé ne peut jamais être inférieur à 3 000 Ar, sauf si le salaire imposable est strictement inférieur ou égal au seuil d'exonération de 350 000 Ar (auquel cas l'impôt est de 0 Ar).</p>
                    </div>
                    <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                      <h4 className={`font-semibold mb-2 ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>5. Réduction pour Charges de Famille</h4>
                      <p className="text-sm">Une réduction de 2 000 Ar par enfant à charge est appliquée sur l'impôt brut. Attention : même après réduction, l'IRSA net final ne peut pas descendre en dessous du minimum légal de 3 000 Ar.</p>
                    </div>
                  </div>
                </div>

                {/* Nouveautés 2026 */}
                <div>
                  <h3 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Nouveautés de la Loi de Finances 2026</h3>
                  <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-purple-500/10 border border-purple-500/30' : 'bg-purple-50 border border-purple-200'}`}>
                    <ul className={`space-y-2 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400 mt-1">•</span>
                        <span>Introduction d'une nouvelle tranche à 25% pour les revenus supérieurs à 4 000 000 Ar</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400 mt-1">•</span>
                        <span>Relèvement du minimum de perception de 2 000 Ar à 3 000 Ar</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400 mt-1">•</span>
                        <span>Maintien de la réduction pour charges de famille à 2 000 Ar par enfant</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Feedback Tab */}
          {activeTab === 'feedback' && (
            <div className={`${isDarkMode ? 'bg-slate-800/50 backdrop-blur-sm border border-slate-700/50' : 'bg-white/80 backdrop-blur-sm border border-slate-200/50'} rounded-2xl p-6 md:p-8 shadow-xl`}>
              <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>Avis & Feedback</h2>
              
              <p className={`mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Votre avis est important pour nous ! N'hésitez pas à nous faire part de vos suggestions, signalements d'erreurs ou simplement pour nous donner votre retour sur cet outil.
              </p>

              {feedbackSubmitted ? (
                <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-emerald-50 border border-emerald-200'} text-center`}>
                  <div className="text-emerald-500 text-4xl mb-3">✓</div>
                  <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>Message envoyé !</h3>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Merci pour votre feedback. Nous vous répondrons dans les plus brefs délais.</p>
                </div>
              ) : (
                <form
                  onSubmit={handleFeedbackSubmit}
                  className="space-y-6"
                >
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Nom
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={feedbackName}
                      onChange={(e) => setFeedbackName(e.target.value)}
                      required
                      className={`w-full px-4 py-3 ${isDarkMode ? 'bg-slate-900/50 border-slate-600 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'} rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all`}
                      placeholder="Votre nom"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={feedbackEmail}
                      onChange={(e) => setFeedbackEmail(e.target.value)}
                      required
                      className={`w-full px-4 py-3 ${isDarkMode ? 'bg-slate-900/50 border-slate-600 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'} rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all`}
                      placeholder="votre@email.com"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Message
                    </label>
                    <textarea
                      name="message"
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      required
                      rows={5}
                      className={`w-full px-4 py-3 ${isDarkMode ? 'bg-slate-900/50 border-slate-600 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'} rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none`}
                      placeholder="Votre message..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/30 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Envoyer le message
                  </button>

                </form>
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className={`bottom-0 left-0 right-0 py-4 text-center text-sm ${isDarkMode ? 'bg-slate-900/90 border-t border-slate-800 text-slate-500' : 'bg-white/90 border-t border-slate-200 text-slate-600'} backdrop-blur-sm`}>
          <p>- Fait par Roni Ratsimbazafy -</p>
        </footer>
      </div>
    </div>
  );
}
