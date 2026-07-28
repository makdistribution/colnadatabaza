import React, { useState } from 'react';
import { ActiveTab } from '../types';
import { 
  Building2, 
  Key, 
  FileText, 
  BarChart3, 
  Database, 
  ChevronDown, 
  ExternalLink,
  Search,
  BookOpen,
  Folder
} from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onResetData?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  searchTerm,
  setSearchTerm,
  onResetData
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="bg-white text-slate-900 border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top Banner Button */}
      <div className="py-1 text-center border-b border-slate-800 flex items-center justify-center gap-2" style={{ backgroundColor: '#000a2f' }}>
        <button 
          onClick={() => setActiveTab('COLNA_DATABAZA')}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-1 rounded shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          title="Prejsť na Aktuálnu Colnú Databázu"
        >
          <span>➡</span> RÝCHLY NÁVRAT DO AKTUÁLNEJ DATABÁZY <span>⬅</span>
        </button>
      </div>

      {/* Main Bar */}
      <div className="w-full px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveTab('COLNA_DATABAZA')}
            className="flex items-center gap-2.5 text-left transition-opacity cursor-pointer group"
          >
            <img 
              src="/mklogo.png" 
              alt="MAK DISTRIBUTION Logo" 
              className="h-8 w-8 object-contain rounded p-0.5"
              onError={(e) => {
                // Fallback to M if image fails to render
                const target = e.target as HTMLElement;
                target.style.display = 'none';
                if (target.nextElementSibling) {
                  (target.nextElementSibling as HTMLElement).style.display = 'flex';
                }
              }}
            />
            <div className="w-8 h-8 rounded bg-blue-600 hidden items-center justify-center font-bold text-white shadow-xs">
              M
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-slate-900">
                MAK DISTRIBUTION
              </span>
            </div>
          </button>
        </div>

        {/* Center / Right Links */}
        <div className="flex items-center gap-1 sm:gap-2 text-xs">
          {/* Main Table Button */}
          <button
            onClick={() => setActiveTab('COLNA_DATABAZA')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer border-[3px] border-[#EF4130] ${
              activeTab === 'COLNA_DATABAZA' 
                ? 'bg-blue-50 text-blue-700 shadow-xs' 
                : 'text-[#45556c] hover:bg-slate-100'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[#45556c] hidden md:inline">ACTUAL</span>
            <span className="text-[#45556c]">COLNÁ DATABÁZA</span>
          </button>

          {/* Dropdown Menu for Fakturácia, Login, Adresy */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer border-[3px] border-[#EF4130] ${
                ['ADRESY', 'LOGIN_UDAJE', 'INFO_FA', 'REPORTY_2025', 'REPORTY_2026'].includes(activeTab)
                  ? 'bg-blue-50 text-blue-700 shadow-xs'
                  : 'text-[#45556c] hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[#45556c]">FAKTURÁCIA • LOGIN • ADRESY</span>
              <ChevronDown className={`w-3.5 h-3.5 text-[#45556c] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-1 w-60 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50 divide-y divide-slate-100 text-slate-700">
                <div className="py-1">
                  <button
                    onClick={() => { setActiveTab('INFO_FA'); setDropdownOpen(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2 cursor-pointer text-xs font-medium"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                    <span>AKO VYSTAVIŤ FA</span>
                  </button>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => { setActiveTab('LOGIN_UDAJE'); setDropdownOpen(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2 cursor-pointer text-xs font-medium"
                  >
                    <Key className="w-3.5 h-3.5 text-emerald-600" />
                    <span>LOGIN ÚDAJE I & II</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('ADRESY'); setDropdownOpen(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2 cursor-pointer text-xs font-medium"
                  >
                    <Building2 className="w-3.5 h-3.5 text-sky-600" />
                    <span>ADRESÁR ZÁKAZNÍKOV</span>
                  </button>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => { setActiveTab('REPORTY_2026'); setDropdownOpen(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2 cursor-pointer text-xs font-medium"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-semibold text-blue-600">REPORTY 2026</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('REPORTY_2025'); setDropdownOpen(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2 cursor-pointer text-xs font-medium"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                    <span>REPORTY 2025</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Third Banner: SÚBORY */}
          <button
            onClick={() => setActiveTab('SUBORY')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer border-[3px] border-[#EF4130] ${
              activeTab === 'SUBORY'
                ? 'bg-blue-50 text-blue-700 shadow-xs'
                : 'text-[#45556c] hover:bg-slate-100'
            }`}
          >
            <Folder className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[#45556c]">SÚBORY</span>
          </button>

          {/* External links */}
          <a
            href="https://www.customspro.net/login"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:flex items-center gap-1 px-2.5 py-1 text-[#45556c] hover:text-blue-600 hover:bg-slate-100 rounded-lg border-[3px] border-[#EF4130] transition-colors font-medium"
            title="Otvoriť GETLINK Customs"
          >
            <span className="text-[#45556c]">💻 GETLINK CUSTOMS</span>
            <ExternalLink className="w-3 h-3 text-[#45556c] opacity-60" />
          </a>

          <a
            href="https://sites.google.com/view/makcolnica/getlink-gmr-direct?authuser=0"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden xl:flex items-center gap-1 px-2.5 py-1 text-[#45556c] hover:text-blue-600 hover:bg-slate-100 rounded-lg border-[3px] border-[#EF4130] transition-colors font-medium"
            title="Otvoriť GETLINK GMR"
          >
            <span className="text-[#45556c]">🚛 GETLINK GMR</span>
            <ExternalLink className="w-3 h-3 text-[#45556c] opacity-60" />
          </a>

          {/* Search Input */}
          <div className="relative hidden sm:block w-36 md:w-48">
            <input
              type="text"
              placeholder="Hľadať v databáze..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-100 border border-slate-200 text-slate-900 text-xs rounded-lg pl-8 pr-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 transition-all"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          </div>

          {/* Data Reset Button */}
          {onResetData && (
            <button
              onClick={onResetData}
              className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 rounded-lg transition-colors font-medium"
              title="Obnoviť pôvodné ukážkové dáta z fotiek"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
