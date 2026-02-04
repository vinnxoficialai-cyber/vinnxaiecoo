import React, { useState, useEffect } from 'react';
import SalesForm from './components/SalesForm';
import Dashboard from './components/Dashboard';
import { Suppliers } from './components/Suppliers';
import { Inventory } from './components/Inventory';
import { ProfitCalculator } from './components/ProfitCalculator';
import { Login } from './components/Login';
import { PlusIcon, HomeIcon, SparklesIcon, PackageIcon, UsersIcon, CalculatorIcon, XIcon, LogOutIcon } from './components/ui/Icons';
import { db } from './services/db';
import { analyzeSalesData } from './services/geminiService';
import { authService } from './services/authService';
import { SaleWithDetails } from './types';

type View = 'dashboard' | 'sales' | 'inventory' | 'suppliers' | 'calculator';

const App: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Read initial view from localStorage or default to 'dashboard'
  const [currentView, setCurrentView] = useState<View>(() => {
    return (localStorage.getItem('currentView') as View) || 'dashboard';
  });

  // Persist view changes
  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('currentView', currentView);
    }
  }, [currentView, isAuthenticated]);
  const [sales, setSales] = useState<SaleWithDetails[]>([]);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Mobile Sidebar State (For "Menu" tab - kept for responsive logic if needed, though button is removed)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Load data function
  const loadData = async () => {
    const salesData = await db.getSalesWithDetails();
    setSales(salesData);
  };

  // Check existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const session = await authService.getSession();
      setIsAuthenticated(!!session);
      setIsCheckingAuth(false);
    };
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [currentView, isAuthenticated]);

  const handleLogout = async () => {
    await authService.signOut();
    setIsAuthenticated(false);
  };

  const handleSaleComplete = () => {
    loadData();
    setCurrentView('dashboard');
  };

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    setAiInsight(null);
    const result = await analyzeSalesData(sales);
    setAiInsight(result);
    setIsAnalyzing(false);
  };

  // Sidebar Menu Item Component (Desktop)
  const MenuItem = ({ view, icon: Icon, label }: { view: View; icon: any; label: string }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setIsSidebarOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${currentView === view
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
        }`}
    >
      <Icon className={`w-5 h-5 ${currentView === view ? 'text-white' : 'text-zinc-500'}`} />
      {label}
    </button>
  );

  // --- RENDER LOADING WHILE CHECKING AUTH ---
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // --- RENDER LOGIN IF NOT AUTHENTICATED ---
  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  // --- RENDER APP IF AUTHENTICATED ---
  return (
    <div className="min-h-screen bg-background font-sans text-zinc-100 flex">

      {/* MOBILE OVERLAY (For when Menu/Sidebar is open - technically unreachable via button now, but kept for safety) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR NAVIGATION (Desktop Fixed / Mobile Drawer triggered by 'Menu') */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border shadow-2xl transform transition-transform duration-300 ease-in-out md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100">Vinnx<span className="text-blue-500">AI</span></h1>
            <p className="text-xs text-zinc-500">Marketplace</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-zinc-400 p-2">
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <nav className="px-4 space-y-2 mt-4">
          <MenuItem view="dashboard" icon={HomeIcon} label="Visão Geral" />
          <div className="pt-4 pb-2 px-4 text-xs font-bold text-zinc-600 uppercase tracking-wider">Operacional</div>
          <MenuItem view="sales" icon={PlusIcon} label="Nova Venda" />
          <MenuItem view="inventory" icon={PackageIcon} label="Estoque" />
          <MenuItem view="suppliers" icon={UsersIcon} label="Fornecedores" />
          <div className="pt-4 pb-2 px-4 text-xs font-bold text-zinc-600 uppercase tracking-wider">Ferramentas</div>
          <MenuItem view="calculator" icon={CalculatorIcon} label="Calculadora Lucro" />
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">

        {/* TOP HEADER */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-zinc-100">
              {currentView === 'dashboard' ? 'Dashboard' :
                currentView === 'sales' ? 'Nova Venda' :
                  currentView === 'inventory' ? 'Estoque' :
                    currentView === 'suppliers' ? 'Fornecedores' :
                      currentView === 'calculator' ? 'Calculadora' : 'Sistema'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {currentView === 'dashboard' && (
              <button
                onClick={handleAiAnalysis}
                disabled={isAnalyzing}
                className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs font-bold shadow-lg shadow-indigo-900/20 hover:bg-indigo-500 transition-all disabled:opacity-70 active:scale-95"
              >
                <SparklesIcon className="w-4 h-4" />
                {isAnalyzing ? '...' : 'Insights'}
              </button>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-zinc-800 text-zinc-300 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs font-medium hover:bg-zinc-700 transition-all active:scale-95"
              title="Sair"
            >
              <LogOutIcon className="w-4 h-4" />
              <span className="hidden md:inline">Sair</span>
            </button>
          </div>
        </header>

        {/* CONTENT (With padding bottom for mobile nav) */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-28 md:pb-6">

          {/* AI Insight Box */}
          {aiInsight && currentView === 'dashboard' && (
            <div className="mb-6 bg-indigo-950/30 p-6 rounded-xl border border-indigo-500/30 shadow-sm relative overflow-hidden animate-in fade-in slide-in-from-top-4">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <SparklesIcon className="w-32 h-32 text-indigo-400" />
              </div>
              <h3 className="font-bold text-indigo-300 mb-2 flex items-center gap-2">
                <SparklesIcon className="w-5 h-5" /> Análise Gemini
              </h3>
              <div className="text-sm text-indigo-100 leading-relaxed whitespace-pre-wrap">
                {aiInsight}
              </div>
              <button
                onClick={() => setAiInsight(null)}
                className="text-xs text-indigo-400 mt-4 hover:text-indigo-300 underline font-medium"
              >
                Fechar análise
              </button>
            </div>
          )}

          <div className="fade-in max-w-5xl mx-auto">
            {currentView === 'dashboard' && <Dashboard sales={sales} />}
            {currentView === 'sales' && <SalesForm onSaleComplete={handleSaleComplete} />}
            {currentView === 'inventory' && <Inventory />}
            {currentView === 'suppliers' && <Suppliers />}
            {currentView === 'calculator' && <ProfitCalculator />}
          </div>
        </main>

        {/* MOBILE BOTTOM NAVIGATION BAR */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#18181b] border-t border-zinc-800 z-50 flex justify-between items-center px-2 pb-safe">
          {/* Início */}
          <button
            onClick={() => { setCurrentView('dashboard'); setIsSidebarOpen(false); }}
            className={`flex flex-col items-center gap-1 p-3 flex-1 ${currentView === 'dashboard' ? 'text-blue-500' : 'text-zinc-500'}`}
          >
            <HomeIcon className="w-6 h-6" />
            <span className="text-[10px] font-medium">Início</span>
          </button>

          {/* Estoque */}
          <button
            onClick={() => { setCurrentView('inventory'); setIsSidebarOpen(false); }}
            className={`flex flex-col items-center gap-1 p-3 flex-1 ${currentView === 'inventory' ? 'text-blue-500' : 'text-zinc-500'}`}
          >
            <PackageIcon className="w-6 h-6" />
            <span className="text-[10px] font-medium">Estoque</span>
          </button>

          {/* CENTRAL ACTION: Vender */}
          <div className="relative -top-5">
            <button
              onClick={() => { setCurrentView('sales'); setIsSidebarOpen(false); }}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-4 border-background transition-transform active:scale-95 ${currentView === 'sales' ? 'bg-blue-500 text-white shadow-blue-500/40' : 'bg-blue-600 text-white shadow-blue-900/40'}`}
            >
              <PlusIcon className="w-7 h-7" />
            </button>
          </div>

          {/* Fornecedores */}
          <button
            onClick={() => { setCurrentView('suppliers'); setIsSidebarOpen(false); }}
            className={`flex flex-col items-center gap-1 p-3 flex-1 ${currentView === 'suppliers' ? 'text-blue-500' : 'text-zinc-500'}`}
          >
            <UsersIcon className="w-6 h-6" />
            <span className="text-[10px] font-medium">Forn.</span>
          </button>

          {/* Calculadora (Replaces Menu) */}
          <button
            onClick={() => { setCurrentView('calculator'); setIsSidebarOpen(false); }}
            className={`flex flex-col items-center gap-1 p-3 flex-1 ${currentView === 'calculator' ? 'text-blue-500' : 'text-zinc-500'}`}
          >
            <CalculatorIcon className="w-6 h-6" />
            <span className="text-[10px] font-medium">Calc</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default App;