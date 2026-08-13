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
  BookOpen,
  Folder,
  ArrowLeftRight
} from 'lucide-react';
import { VatEoriCheckerModal, type VatEoriRegion } from './VatEoriCheckerModal';
import { HsCodeCheckerModal } from './HsCodeCheckerModal';
import { VatEoriSearchModal } from './VatEoriSearchModal';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  availableYears?: number[];
  activeReportYear?: number;
}

type ColnicaModal =
  | { kind: 'vatEori'; region: VatEoriRegion }
  | { kind: 'tariff'; title: string; flagSrc: string }
  | { kind: 'search' }
  | null;

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  availableYears = [],
  activeReportYear = availableYears[0] ?? 0,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [colnicaDropdownOpen, setColnicaDropdownOpen] = useState(false);
  const [colnicaModal, setColnicaModal] = useState<ColnicaModal>(null);

  const colnicaTabs = [
    'COLNICA_GB_VAT_EORI',
    'COLNICA_EU_VAT_EORI',
    'COLNICA_GB_TARIFF',
    'COLNICA_EU_TARIFF',
    'COLNICA_REX',
  ];
  const isColnicaActive = colnicaTabs.includes(activeTab);

  // Currency Converter state (GBP ↔ EUR with exchange rate ~1.18)
  const RATE = 1.18; // 1 GBP = 1.18 EUR
  const [gbpVal, setGbpVal] = useState<string>('');
  const [eurVal, setEurVal] = useState<string>('');

  const handleGbpChange = (val: string) => {
    let cleanVal = val.replace(',', '.').replace(/\s/g, '');
    if (!cleanVal) {
      setGbpVal('');
      setEurVal('');
      return;
    }
    
    // Check if ends with dot or dot followed by numbers
    const num = parseFloat(cleanVal);
    if (isNaN(num)) {
      setGbpVal(val);
      return;
    }

    // Format thousands separator with space
    const parts = cleanVal.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const formattedGbp = parts.join('.');

    setGbpVal(formattedGbp);

    const eurCalculated = (num * RATE).toFixed(2);
    const eurParts = eurCalculated.split('.');
    eurParts[0] = eurParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    setEurVal(eurParts.join('.'));
  };

  const handleEurChange = (val: string) => {
    let cleanVal = val.replace(',', '.').replace(/\s/g, '');
    if (!cleanVal) {
      setEurVal('');
      setGbpVal('');
      return;
    }
    
    const num = parseFloat(cleanVal);
    if (isNaN(num)) {
      setEurVal(val);
      return;
    }

    const parts = cleanVal.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const formattedEur = parts.join('.');

    setEurVal(formattedEur);

    const gbpCalculated = (num / RATE).toFixed(2);
    const gbpParts = gbpCalculated.split('.');
    gbpParts[0] = gbpParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    setGbpVal(gbpParts.join('.'));
  };

  const handleGbpBlur = () => {
    if (!gbpVal) return;
    const cleanVal = gbpVal.replace(',', '.').replace(/\s/g, '');
    const num = parseFloat(cleanVal);
    if (!isNaN(num)) {
      const formatted = num.toFixed(2);
      const parts = formatted.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      setGbpVal(parts.join('.'));
    }
  };

  const handleEurBlur = () => {
    if (!eurVal) return;
    const cleanVal = eurVal.replace(',', '.').replace(/\s/g, '');
    const num = parseFloat(cleanVal);
    if (!isNaN(num)) {
      const formatted = num.toFixed(2);
      const parts = formatted.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      setEurVal(parts.join('.'));
    }
  };

  return (
    <>
    <div className="bg-[#000a2f] pt-2 pb-1.5">
      {/* Top Banner Empty Blue Bar */}
      <div className="h-1.5 w-full mb-1" style={{ backgroundColor: '#000a2f' }} />

      {/* Main Bar with Table Styling */}
      <div className="w-full px-3 sm:px-6 lg:px-8">
        <div className="bg-white border-2 border-slate-300 rounded-2xl shadow-xs px-3 sm:px-5 h-14 flex items-center justify-between gap-2.5">
        {/* Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => setActiveTab('COLNA_DATABAZA')}
            className="flex items-center gap-2.5 text-left transition-opacity cursor-pointer group whitespace-nowrap shrink-0"
          >
            <img 
              src="/mklogo.png" 
              alt="MAK DISTRIBUTION Logo" 
              className="object-contain rounded p-0.5 shrink-0"
              style={{ width: '36px', height: '36px' }}
              onError={(e) => {
                // Fallback to M if image fails to render
                const target = e.target as HTMLElement;
                target.style.display = 'none';
                if (target.nextElementSibling) {
                  (target.nextElementSibling as HTMLElement).style.display = 'flex';
                }
              }}
            />
            <div className="w-8 h-8 rounded bg-blue-600 hidden items-center justify-center font-bold text-white shadow-xs shrink-0">
              M
            </div>
            <div className="whitespace-nowrap shrink-0">
              <span 
                className="font-bold tracking-tight text-slate-900 whitespace-nowrap"
                style={{ fontSize: '20px', fontFamily: 'Verdana, sans-serif' }}
              >
                MAK DISTRIBUTION
              </span>
            </div>
          </button>
        </div>

        {/* Center Links — ~8–10px gaps matching abc.png */}
        <div className="flex items-center gap-2.5 text-xs py-1 min-w-0">
          {/* Main Table Button */}
          <button
            onClick={() => setActiveTab('COLNA_DATABAZA')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer border-[3px] border-[#07538e] whitespace-nowrap shrink-0 ${
              activeTab === 'COLNA_DATABAZA' 
                ? 'bg-amber-100/70 text-slate-900 shadow-xs font-bold' 
                : 'bg-white text-[#45556c] hover:bg-slate-50'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="whitespace-nowrap">ACTUAL COLNÁ DATABÁZA</span>
          </button>

          {/* Dropdown Menu for Fakturácia, Login, Adresy */}
          <div className="relative shrink-0">
            <button
              onClick={() => {
                setDropdownOpen(!dropdownOpen);
                setColnicaDropdownOpen(false);
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer border-[3px] border-[#07538e] whitespace-nowrap shrink-0 ${
                ['ADRESY', 'LOGIN_UDAJE', 'INFO_FA'].includes(activeTab) || activeTab.startsWith('REPORTY_')
                  ? 'bg-amber-100/70 text-slate-900 shadow-xs font-bold'
                  : 'bg-white text-[#45556c] hover:bg-slate-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="whitespace-nowrap">FAKTURÁCIA • LOGIN • ADRESY</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setDropdownOpen(false)} 
                />
                <div className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl py-1 z-50 divide-y divide-slate-500 text-slate-700">
                  <div className="py-1">
                    <button
                      onClick={() => { setActiveTab('INFO_FA'); setDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2 cursor-pointer text-xs font-medium"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>AKO VYSTAVIŤ FA</span>
                    </button>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => { setActiveTab('LOGIN_UDAJE'); setDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2 cursor-pointer text-xs font-medium"
                    >
                      <Key className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>LOGIN ÚDAJE I & II</span>
                    </button>
                    <button
                      onClick={() => { setActiveTab('ADRESY'); setDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2 cursor-pointer text-xs font-medium"
                    >
                      <Building2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span>ADRESÁR ZÁKAZNÍKOV</span>
                    </button>
                  </div>

                  <div className="py-1">
                    {availableYears.map((y) => {
                      const isLatest = y === activeReportYear;
                      const tabName = `REPORTY_${y}` as ActiveTab;
                      return (
                        <button
                          key={y}
                          onClick={() => { setActiveTab(tabName); setDropdownOpen(false); }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2 cursor-pointer text-xs font-medium"
                        >
                          <BarChart3 className={`w-3.5 h-3.5 shrink-0 ${isLatest ? 'text-blue-600' : 'text-slate-400'}`} />
                          <span className={isLatest ? 'font-bold text-blue-600' : 'font-normal text-slate-400'}>
                            REPORTY {y}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Third Banner: SÚBORY */}
          <button
            onClick={() => setActiveTab('SUBORY')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer border-[3px] border-[#07538e] whitespace-nowrap shrink-0 ${
              activeTab === 'SUBORY'
                ? 'bg-amber-100/70 text-slate-900 shadow-xs font-bold'
                : 'bg-white text-[#45556c] hover:bg-slate-50'
            }`}
          >
            <Folder className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="whitespace-nowrap">SÚBORY</span>
          </button>

          {/* VAT / EORI / HS CODE dropdown — same style as FAKTURÁCIA • LOGIN • ADRESY */}
          <div className="relative shrink-0">
            <button
              onClick={() => {
                setColnicaDropdownOpen(!colnicaDropdownOpen);
                setDropdownOpen(false);
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer border-[3px] border-[#07538e] whitespace-nowrap shrink-0 ${
                isColnicaActive
                  ? 'bg-amber-100/70 text-slate-900 shadow-xs font-bold'
                  : 'bg-white text-[#45556c] hover:bg-slate-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="whitespace-nowrap">VAT / EORI / HS CODE</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform shrink-0 ${colnicaDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {colnicaDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setColnicaDropdownOpen(false)}
                />
                <div className="absolute left-0 mt-2 w-[22rem] bg-white border border-slate-200 rounded-xl shadow-2xl py-1 z-50 divide-y divide-slate-500 text-slate-700">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setColnicaModal({ kind: 'vatEori', region: 'GB' });
                        setColnicaDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2 cursor-pointer text-xs font-medium"
                    >
                      <img src="/uk1.png" alt="" className="w-5 h-5 object-contain shrink-0 self-center" />
                      <span>VAT/EORI CHECKER</span>
                    </button>
                    <button
                      onClick={() => {
                        setColnicaModal({ kind: 'vatEori', region: 'EU' });
                        setColnicaDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2 cursor-pointer text-xs font-medium"
                    >
                      <img src="/eu1.png" alt="" className="w-5 h-5 object-contain shrink-0 self-center" />
                      <span>VAT/EORI CHECKER</span>
                    </button>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setColnicaModal({
                          kind: 'tariff',
                          title: 'ONLINE TARIFF',
                          flagSrc: '/uk1.png',
                        });
                        setColnicaDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2 cursor-pointer text-xs font-medium"
                    >
                      <img src="/uk1.png" alt="" className="w-5 h-5 object-contain shrink-0 self-center" />
                      <span>ONLINE TARIFF</span>
                    </button>
                    <button
                      onClick={() => {
                        setColnicaModal({
                          kind: 'tariff',
                          title: 'ONLINE TARIC',
                          flagSrc: '/eu1.png',
                        });
                        setColnicaDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2 cursor-pointer text-xs font-medium"
                    >
                      <img src="/eu1.png" alt="" className="w-5 h-5 object-contain shrink-0 self-center" />
                      <span>ONLINE TARIC</span>
                    </button>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setColnicaModal({ kind: 'search' });
                        setColnicaDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-1.5 cursor-pointer text-xs font-medium whitespace-nowrap"
                    >
                      <img src="/uk1.png" alt="" className="w-5 h-5 object-contain shrink-0 self-center" />
                      <img src="/eu1.png" alt="" className="w-5 h-5 object-contain shrink-0 self-center" />
                      <span>
                        VAT/EORI no. SEARCH{' '}
                        <span className="font-normal text-[11px] text-slate-500">(by company name)</span>
                      </span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* External links: GETLINK CUSTOMS & GETLINK GMR */}
          <a
            href="https://www.customspro.net/login"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white text-[#45556c] hover:text-blue-600 hover:bg-slate-50 rounded-lg border-[3px] border-[#07538e] transition-colors font-semibold whitespace-nowrap shrink-0"
            title="Otvoriť GETLINK Customs"
          >
            <span className="text-[#45556c] whitespace-nowrap">💻 GETLINK CUSTOMS</span>
            <ExternalLink className="w-3 h-3 text-[#45556c] opacity-60 shrink-0" />
          </a>

          <a
            href="https://sites.google.com/view/makcolnica/getlink-gmr-direct?authuser=0"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white text-[#45556c] hover:text-blue-600 hover:bg-slate-50 rounded-lg border-[3px] border-[#07538e] transition-colors font-semibold whitespace-nowrap shrink-0"
            title="Otvoriť GETLINK GMR"
          >
            <span className="text-[#45556c] whitespace-nowrap">🚛 GETLINK GMR</span>
            <ExternalLink className="w-3 h-3 text-[#45556c] opacity-60 shrink-0" />
          </a>
        </div>

        {/* Currency Exchange Converter (GBP ↔ EUR) */}
        <div className="hidden xl:flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-lg shrink-0 shadow-2xs" title="Prepočet GBP ↔ EUR">
          <div className="relative flex items-center bg-slate-100 border border-slate-300 rounded-md px-2.5 h-7 w-[calc(9rem-0.5cm)]">
            <input
              type="text"
              value={gbpVal}
              onChange={(e) => handleGbpChange(e.target.value)}
              onBlur={handleGbpBlur}
              className="w-full bg-transparent text-xs text-slate-900 focus:outline-none font-bold text-right pr-1"
            />
            <span className="text-[11px] font-bold text-slate-500 select-none shrink-0">GBP</span>
          </div>

          <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600 shrink-0 mx-0.5" />

          <div className="relative flex items-center bg-slate-100 border border-slate-300 rounded-md px-2.5 h-7 w-[calc(9rem-0.5cm)]">
            <input
              type="text"
              value={eurVal}
              onChange={(e) => handleEurChange(e.target.value)}
              onBlur={handleEurBlur}
              className="w-full bg-transparent text-xs text-slate-900 focus:outline-none font-bold text-right pr-1"
            />
            <span className="text-[11px] font-bold text-slate-500 select-none shrink-0">EUR</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <VatEoriCheckerModal
    isOpen={colnicaModal?.kind === 'vatEori'}
    region={colnicaModal?.kind === 'vatEori' ? colnicaModal.region : 'GB'}
    onClose={() => setColnicaModal(null)}
  />
  <HsCodeCheckerModal
    isOpen={colnicaModal?.kind === 'tariff'}
    title={colnicaModal?.kind === 'tariff' ? colnicaModal.title : ''}
    flagSrc={colnicaModal?.kind === 'tariff' ? colnicaModal.flagSrc : '/uk1.png'}
    onClose={() => setColnicaModal(null)}
  />
  <VatEoriSearchModal
    isOpen={colnicaModal?.kind === 'search'}
    onClose={() => setColnicaModal(null)}
  />
  </>
);
};
