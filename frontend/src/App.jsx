import React, { useState } from 'react';
import { Home as HomeIcon, PlayCircle, History as HistoryIcon, Activity, Menu, X } from 'lucide-react';
import Home from './components/Home';
import Evaluate from './components/Evaluate';
import History from './components/History';
import Dashboard from './components/Dashboard';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'evaluate', label: 'Custom Evaluate', icon: PlayCircle },
    { id: 'history', label: 'Run History', icon: HistoryIcon },
    { id: 'home', label: 'About/Glossary', icon: HomeIcon },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-900 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-sm md:text-base tracking-tight bg-gradient-to-r from-white to-slate-350 bg-clip-text text-transparent">
              EvalDashboard
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 ${
                    isActive
                      ? 'bg-slate-900 text-brand-400 border border-slate-800'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl border border-slate-900 text-slate-400 hover:text-slate-200 focus:outline-none"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-900 bg-slate-950 px-4 py-3 space-y-1.5">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-slate-900 text-brand-400 border border-slate-800'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'home' && <Home onLaunch={() => setActiveTab('dashboard')} />}
        {activeTab === 'evaluate' && <Evaluate />}
        {activeTab === 'history' && <History />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-950 py-6 text-center text-xs text-slate-500 font-light mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Model Evaluation Dashboard. Standalone ML Harness.</p>
          <div className="flex gap-4">
            <span className="hover:text-slate-400 cursor-pointer">FastAPI + SQLite</span>
            <span>•</span>
            <span className="hover:text-slate-400 cursor-pointer">React + Tailwind v3</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
