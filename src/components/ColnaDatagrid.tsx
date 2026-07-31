import React, { useState } from 'react';
import { ColnaRecord } from '../types';
import { parseMonthYear, extractYearAndMonth } from '../utils/monthUtils';
import { RecordModal } from './RecordModal';

// Helpers to extract status for the 4 split columns (UK ➔ EU and EU ➔ UK)
const getUkZaclenie = (r: ColnaRecord): string => {
  const v = (r.ukToEu || '').trim();
  const lower = v.toLowerCase();
  if (lower.includes('zaclenie v uk') || lower.includes('uk zaclenie')) {
    return 'zaclenie v UK';
  }
  if (lower.includes('zaclenie v uk; vyclenie v eu')) {
    return 'zaclenie v UK';
  }
  if (v && !lower.includes('vyclenie')) {
    return v;
  }
  return '';
};

const getEuVyclenie = (r: ColnaRecord): string => {
  const v = (r.ukToEu || '').trim();
  const lower = v.toLowerCase();
  if (lower.includes('vyclenie v eu') || lower.includes('eu vyclenie')) {
    return 'vyclenie v EU';
  }
  if (lower.includes('zaclenie v uk; vyclenie v eu')) {
    return 'vyclenie v EU';
  }
  if (v && lower.includes('vyclenie')) {
    return 'vyclenie v EU';
  }
  return '';
};

const getEuZaclenie = (r: ColnaRecord): string => {
  const v = (r.euToUk || '').trim();
  const lower = v.toLowerCase();
  if (lower.includes('zaclenie v eu') || lower.includes('eu zaclenie') || lower.includes('eu vyclenie')) {
    return 'zaclenie v EU';
  }
  if (lower.includes('zaclenie v eu; vyclenie v uk')) {
    return 'zaclenie v EU';
  }
  if (v && !lower.includes('vyclenie')) {
    return v;
  }
  return '';
};

const getUkVyclenie = (r: ColnaRecord): string => {
  const v = (r.euToUk || '').trim();
  const lower = v.toLowerCase();
  if (lower.includes('vyclenie v uk') || lower.includes('uk vyclenie')) {
    return 'vyclenie v UK';
  }
  if (lower.includes('zaclenie v eu; vyclenie v uk')) {
    return 'vyclenie v UK';
  }
  if (v && lower.includes('vyclenie')) {
    return 'vyclenie v UK';
  }
  return '';
};

import { 
  Plus, 
  Trash2, 
  Search, 
  Edit3, 
  Check, 
  Bell, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Printer,
  Download,
  Filter,
  Lock,
  CheckCircle2,
  Calendar,
  X,
  FileCheck,
  Clock
} from 'lucide-react';

interface ColnaDatagridProps {
  records: ColnaRecord[];
  onAddRecord: () => void;
  onEditRecord: (record: ColnaRecord) => void;
  onDeleteRecords: (ids: string[]) => void;
  onTogglePaid: (id: string, zaplatena: boolean) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  currentMonthYear: string;
  onCloseMonth: (monthYear: string) => void;
  onMonthYearChange: (monthYear: string) => void;
  statusFilter: 'OFF' | 'ALL' | 'UNPAID' | 'NEW';
  setStatusFilter: (filter: 'OFF' | 'ALL' | 'UNPAID' | 'NEW') => void;
}

export const ColnaDatagrid: React.FC<ColnaDatagridProps> = ({
  records,
  onAddRecord,
  onEditRecord,
  onDeleteRecords,
  onTogglePaid,
  searchTerm,
  setSearchTerm,
  currentMonthYear,
  onCloseMonth,
  onMonthYearChange,
  statusFilter,
  setStatusFilter,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeViewTab, setActiveViewTab] = useState<'ACTIVE' | 'COMPLETED' | 'ALL'>('ACTIVE');
  const [currentPage, setCurrentPage] = useState(1);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [previewRecord, setPreviewRecord] = useState<ColnaRecord | null>(null);
  const pageSize = 10;

  const targetYear = parseMonthYear(currentMonthYear).year;

  // Helper to match record date with selected year
  const recordMatchesYear = (recordDateStr: string) => {
    if (!recordDateStr) return true;
    const ym = extractYearAndMonth(recordDateStr);
    return ym ? ym.year === targetYear : true;
  };

  // Helper to match record date with selected monthYear (e.g. "JÚL / 2026")
  const recordMatchesMonthYear = (recordDateStr: string, targetMY: string) => {
    if (!recordDateStr || !targetMY) return true;
    const { month: tMonth, year: tYear } = parseMonthYear(targetMY);
    const ym = extractYearAndMonth(recordDateStr);
    return ym ? ym.year === tYear && ym.month === tMonth : false;
  };

  // 1. First filter by month (or current month records)
  const monthRecords = records.filter(r => recordMatchesMonthYear(r.datumColnice, currentMonthYear));

  // Count active vs completed in current month
  const monthActiveCount = monthRecords.filter(r => !r.isClosed).length;
  const monthCompletedCount = monthRecords.filter(r => r.isClosed).length;
  const monthTotalProfit = monthRecords.reduce((acc, r) => acc + (r.zisk || 0), 0);

  // 2. Filter base view records according to active tab or statusFilter
  const baseViewRecords = records.filter((r) => {
    // If a top status filter is active ('ALL', 'UNPAID', 'NEW'), filter across the year
    if (statusFilter !== 'OFF') {
      return recordMatchesYear(r.datumColnice);
    }

    // Default view (statusFilter === 'OFF') filters strictly by current month
    const matchesMonth = recordMatchesMonthYear(r.datumColnice, currentMonthYear);
    if (!matchesMonth) return false;

    if (activeViewTab === 'ACTIVE') {
      return !r.isClosed;
    }
    if (activeViewTab === 'COMPLETED') {
      return r.isClosed;
    }
    return true;
  });

  // 3. Search & status filter
  const filteredRecords = baseViewRecords.filter((r) => {
    // Search filter
    const matchesSearch = 
      !searchTerm ||
      r.zakaznik.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.spz.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.refNaFa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.cisloFa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.ukToEu.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.euToUk.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.intPoznamka.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'UNPAID') return !r.zaplatena;
    if (statusFilter === 'NEW') return r.isNew;
    if (statusFilter === 'BELL') return r.bell;
    if (statusFilter === 'ALERT') return r.alert;

    return true;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Checkbox handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginatedRecords.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Naozaj chcete vymazať ${selectedIds.length} označené záznamy?`)) {
      onDeleteRecords(selectedIds);
      setSelectedIds([]);
    }
  };

  // Totals calculations
  const totalFaUkAgent = filteredRecords.reduce((acc, r) => acc + (r.faOdUkAgent || 0), 0);
  const totalFaEuAgent = filteredRecords.reduce((acc, r) => acc + (r.faOdEuAgent || 0), 0);
  const totalFaKlient = filteredRecords.reduce((acc, r) => acc + (r.faKlient || 0), 0);
  const totalZisk = filteredRecords.reduce((acc, r) => acc + (r.zisk || 0), 0);

  // Format date DD.MM.YYYY (without spaces after dots)
  const formatDateStr = (dateStr: string) => {
    if (!dateStr) return '';
    if (dateStr.includes('.')) {
      return dateStr.replace(/\.\s+/g, '.').trim();
    }
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parseInt(parts[2], 10)}.${parseInt(parts[1], 10)}.${parts[0]}`;
    }
    return dateStr;
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Zákazník', 'Dátum colnice', 'ŠPZ', 'Ref. na FAKTÚRU', 'zaclenie v UK', 'zaclenie v EU', 'zaclenie v EU', 'vyclenie v UK',
      'FA UK Agent (€)', 'FA EU Agent (€)', 'FA Klient (€)', 'Zisk (€)', 'Číslo FA', 'Splatná', 'Zaplatená'
    ];
    const rows = filteredRecords.map(r => [
      `"${r.zakaznik}"`, `"${formatDateStr(r.datumColnice)}"`, `"${r.spz}"`, `"${r.refNaFa}"`,
      `"${getUkZaclenie(r)}"`, `"${getEuVyclenie(r)}"`, `"${getEuZaclenie(r)}"`, `"${getUkVyclenie(r)}"`, r.faOdUkAgent, r.faOdEuAgent, r.faKlient,
      r.zisk, `"${r.cisloFa}"`, `"${formatDateStr(r.splatna)}"`, r.zaplatena ? 'Áno' : 'Nie'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mak_colna_databaza_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white border-2 border-slate-400 rounded-xl shadow-xs overflow-hidden my-4">
      
      {/* Top Filter & Action Bar */}
      <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Add & Delete & Uzatvorit Mesiac buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onAddRecord}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> PRIDAŤ ZÁZNAM
          </button>

          <button
            onClick={handleDeleteSelected}
            disabled={selectedIds.length === 0}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer font-semibold ${
              selectedIds.length > 0
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" /> Vymazať {selectedIds.length > 0 && `(${selectedIds.length})`}
          </button>

          <button
            onClick={() => setIsCloseModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title={`Uzatvoriť mesiac ${currentMonthYear} a preniesť dáta do Reportov`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Uzatvoriť mesiac {currentMonthYear}</span>
          </button>

          {/* Active vs Completed View Filter */}
          <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-lg border border-slate-300 ml-1">
            <button
              onClick={() => { setStatusFilter('OFF'); setActiveViewTab('ACTIVE'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeViewTab === 'ACTIVE' && statusFilter === 'OFF'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Aktívne ({monthActiveCount})</span>
            </button>
            <button
              onClick={() => { setStatusFilter('OFF'); setActiveViewTab('COMPLETED'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeViewTab === 'COMPLETED' && statusFilter === 'OFF'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <FileCheck className="w-3 h-3" />
              <span>Ukončené ({monthCompletedCount})</span>
            </button>
            <button
              onClick={() => { setStatusFilter('OFF'); setActiveViewTab('ALL'); setCurrentPage(1); }}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                activeViewTab === 'ALL' && statusFilter === 'OFF'
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Všetky ({monthRecords.length})
            </button>
          </div>
        </div>

        {/* Pagination bar (only shown if there are multiple pages) */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5 text-slate-600">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer text-slate-600"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer text-slate-600"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="font-mono text-xs font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-800">
              {filteredRecords.length} záznamov (s. {currentPage}/{totalPages})
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer text-slate-600"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer text-slate-600"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Search Input & Export buttons */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Vyhľadať..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-slate-200 text-slate-900 rounded-lg px-2.5 py-1.5 pr-7 text-xs w-36 sm:w-48 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2" />
          </div>

          <button
            onClick={handleExportCSV}
            className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium cursor-pointer shadow-2xs"
            title="Exportovať do CSV"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" /> CSV
          </button>
          <button
            onClick={() => window.print()}
            className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 p-1.5 rounded-lg flex items-center justify-center cursor-pointer shadow-2xs"
            title="Tlač tabuľky"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Main Table Grid */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#dae3ed] text-black uppercase font-extrabold tracking-wider border-b border-slate-300 select-none text-[16px] leading-tight font-sans">
              <th rowSpan={2} className="p-2 w-7 text-center border-r border-slate-300 text-black">
                <input
                  type="checkbox"
                  checked={paginatedRecords.length > 0 && selectedIds.length === paginatedRecords.length}
                  onChange={handleSelectAll}
                  className="rounded text-blue-600 focus:ring-0 w-3.5 h-3.5 border-slate-400"
                />
              </th>
              <th rowSpan={2} className="p-2 w-10 text-center border-r border-slate-300 text-black">
                <img src="/edit1.png" alt="Edit" className="mx-auto h-6 w-auto object-contain" />
              </th>
              <th rowSpan={2} className="p-2 min-w-[150px] border-r border-slate-300 text-black">
                ZÁKAZNÍK
              </th>
              <th rowSpan={2} className="p-1 w-4 text-center border-r border-slate-300 text-black" title="Nové colné konanie v evidencii">
                NEW
              </th>
              <th rowSpan={2} className="p-2 min-w-[40px] text-center border-r border-slate-300 text-black" title="Odoslať na fakturáciu">
                <img src="/mail.png" alt="Fakturácia" className="mx-auto object-contain -mb-[3px] p-0" style={{ width: '26.375px', height: '41px' }} />
              </th>
              <th rowSpan={2} className="p-2 min-w-[36px] text-center border-r border-slate-300 text-black" title="Upozornenie o zmene">
                <img src="/edit.png" alt="Zmena" className="mx-auto object-contain p-0" style={{ width: '23px', height: '41px', marginTop: '2px', marginLeft: '0px', paddingTop: '0px', paddingLeft: '0px' }} />
              </th>
              <th rowSpan={2} className="p-1 min-w-[66px] border-r border-slate-300 text-black">
                DÁTUM
              </th>
              <th rowSpan={2} className="p-2 min-w-[110px] border-r border-slate-300 text-black">
                ŠPZ 🚛
              </th>
              <th rowSpan={2} className="p-2 min-w-[80px] border-r border-slate-300 font-sans text-black">
                REF. NA FAKTÚRU
              </th>
              <th colSpan={2} className="p-1.5 text-center border-r border-b border-slate-300 text-black bg-blue-100 font-bold text-[16px] leading-[20px] font-sans">
                <img src="/uk1.png" alt="UK" className="inline-block w-5 h-5 object-contain" /> <span className="inline-block translate-y-[2px]">➔</span> <img src="/eu1.png" alt="EU" className="inline-block w-5 h-5 object-contain" />
              </th>
              <th colSpan={2} className="p-1.5 text-center border-r border-b border-[#bdc0e8] text-black bg-[#dbeafe] font-bold text-[16px] leading-[20px] font-sans">
                <img src="/eu1.png" alt="EU" className="inline-block w-5 h-5 object-contain" /> <span className="inline-block translate-y-[2px]">➔</span> <img src="/uk1.png" alt="UK" className="inline-block w-5 h-5 object-contain" />
              </th>
              <th rowSpan={2} className="p-2 min-w-[85px] text-right border-r border-slate-300 font-sans text-black">
                <span className="whitespace-nowrap">FA OD UK</span>
                <br/>
                <span className="whitespace-nowrap mr-[5px]">AGENTA</span>
              </th>
              <th rowSpan={2} className="p-2 min-w-[85px] text-right border-r border-slate-300 font-sans text-black">
                <span className="whitespace-nowrap">FA OD EU</span>
                <br/>
                <span className="whitespace-nowrap pr-[5px]">AGENTA</span>
              </th>
              <th rowSpan={2} className="p-2 min-w-[70px] text-center border-r border-slate-300 text-black">
                <span className="whitespace-nowrap">FA NA</span>
                <br/>
                <span className="whitespace-nowrap">ZÁKAZNÍKA</span>
              </th>
              <th rowSpan={2} className="p-2 min-w-[95px] border-r border-slate-300 text-black">
                POZNÁMKA
              </th>
              <th rowSpan={2} className="p-2 min-w-[75px] text-right border-r border-slate-300 text-black font-extrabold whitespace-nowrap">
                ZISK (€)
              </th>
              <th rowSpan={2} className="w-[0.9cm] min-w-[0.9cm] max-w-[0.9cm] p-0 text-center align-middle border-r border-slate-300 text-black">
                <img src="/inv.png" alt="Invoice" className="mx-auto h-[28.8px] w-[28.8px] translate-y-[0.5px] object-contain" />
              </th>
              <th rowSpan={2} className="p-2 min-w-[85px] border-r border-slate-300 text-black">
                ČÍSLO FAKTÚRY
              </th>
              <th rowSpan={2} className="p-2 min-w-[62px] border-r border-slate-300 text-black">
                SPLATNÁ
              </th>
              <th rowSpan={2} className="p-2 w-10 text-center text-black">
                ÚHRADA
              </th>
            </tr>
            <tr className="bg-slate-200 text-black font-bold select-none text-[13px] leading-[20px] border-b-2 border-slate-300 font-sans">
              <th className="p-1.5 min-w-[100px] border-r border-slate-300 text-black bg-blue-50/80 text-center font-sans text-[13px] leading-[20px]">
                zaclenie v UK
              </th>
              <th className="p-1.5 min-w-[100px] border-r border-slate-300 text-black bg-blue-50/80 text-center font-sans text-[13px] leading-[20px]">
                vyclenie v EU
              </th>
              <th className="p-1.5 min-w-[100px] border-r border-slate-300 text-black bg-emerald-50/80 text-center font-sans text-[13px] leading-[20px]">
                zaclenie v EU
              </th>
              <th className="p-1.5 min-w-[100px] border-r border-slate-300 text-black bg-emerald-50/80 text-center font-sans text-[13px] leading-[20px]">
                vyclenie v UK
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono text-[12px] text-slate-800">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={22} className="p-10 text-center font-sans">
                  <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto py-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-1">
                      <Plus className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-slate-800 text-sm">
                      Nová prázdna databáza pre mesiac {currentMonthYear}
                    </span>
                    <p className="text-xs text-slate-500 mb-1">
                      Predchádzajúci mesiac bol úspešne uzatvorený do Reportov. Databáza je pripravená na pridávanie nových konaní.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedRecords.map((r, idx) => {
                const isSelected = selectedIds.includes(r.id);
                return (
                  <tr
                    key={r.id}
                    onClick={() => setPreviewRecord(r)}
                    className={`cursor-pointer transition-colors hover:bg-blue-50/50 ${
                      isSelected ? 'bg-blue-50/80' : idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-2 text-center border-r border-slate-200">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(r.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded text-blue-600 focus:ring-0 w-3.5 h-3.5 border-slate-300"
                      />
                    </td>

                    {/* Edit button */}
                    <td className="p-2 text-center border-r border-slate-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditRecord(r);
                        }}
                        className="text-blue-600 hover:text-blue-800 hover:underline flex items-center justify-center mx-auto cursor-pointer font-sans font-semibold text-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </td>

                    {/* Customer */}
                    <td className="p-2 font-mono font-bold text-[12px] text-slate-900 border-r border-slate-200">
                      <button
                        type="button"
                        onClick={() => setPreviewRecord(r)}
                        className="text-left text-slate-900 hover:text-blue-600 cursor-pointer"
                      >
                        {r.zakaznik}
                      </button>
                    </td>

                    {/* NEW flag */}
                    <td className="p-2 text-center border-r border-slate-200">
                      {r.isNew && (
                        <img src="/new1.png" alt="NEW" className="h-8 w-auto mx-auto object-contain shrink-0" title="Nové colné konanie v evidencii" />
                      )}
                    </td>

                    {/* Bell flag (Odoslať na fakturáciu) */}
                    <td className="p-2 text-center border-r border-slate-200">
                      {r.bell && (
                        <Check className="w-5 h-5 text-emerald-600 stroke-[3] mx-auto" title="Odoslané na fakturáciu" />
                      )}
                    </td>

                    {/* Alert flag (Upozornenie o zmene) */}
                    <td className="p-2 text-center border-r border-slate-200">
                      {r.alert && (
                        <Check className="w-5 h-5 text-emerald-600 stroke-[3] mx-auto" title="Upozornenie o zmene bolo zaznamenané" />
                      )}
                    </td>

                    {/* Datum Colnice */}
                    <td className="px-1 py-2 text-slate-700 border-r border-slate-200 font-mono text-[12px] whitespace-nowrap">
                      {formatDateStr(r.datumColnice)}
                    </td>

                    {/* SPZ */}
                    <td className="p-2 font-bold text-slate-800 border-r border-slate-200 font-mono text-[12px]">
                      {r.spz}
                    </td>

                    {/* Ref. na FA */}
                    <td className="p-2 text-slate-700 border-r border-slate-200 text-[12px]">
                      {r.refNaFa}
                    </td>

                    {/* zaclenie v UK */}
                    <td className="p-2 text-center border-r border-slate-200 bg-blue-50/30">
                      {getUkZaclenie(r) ? (
                        <Check className="w-5 h-5 text-emerald-600 mx-auto stroke-[3]" />
                      ) : null}
                    </td>

                    {/* vyclenie v EU */}
                    <td className="p-2 text-center border-r border-slate-200 bg-blue-50/30">
                      {getEuVyclenie(r) ? (
                        <Check className="w-5 h-5 text-emerald-600 mx-auto stroke-[3]" />
                      ) : null}
                    </td>

                    {/* zaclenie v EU */}
                    <td className="p-2 text-center border-r border-slate-200 bg-emerald-50/30">
                      {getEuZaclenie(r) ? (
                        <Check className="w-5 h-5 text-emerald-600 mx-auto stroke-[3]" />
                      ) : null}
                    </td>

                    {/* vyclenie v UK */}
                    <td className="p-2 text-center border-r border-slate-200 bg-emerald-50/30">
                      {getUkVyclenie(r) ? (
                        <Check className="w-5 h-5 text-emerald-600 mx-auto stroke-[3]" />
                      ) : null}
                    </td>

                    {/* FA OD UK AGENT */}
                    <td className="p-2 text-right border-r border-slate-200 text-slate-700 font-mono text-[12px] leading-[16px]">
                      {r.faOdUkAgent ? `${r.faOdUkAgent.toFixed(2).replace('.', ',')}` : '0,00'}
                    </td>

                    {/* FA OD EU AGENT */}
                    <td className="p-2 text-right border-r border-slate-200 text-slate-700 font-mono text-[12px] leading-[16px]">
                      {r.faOdEuAgent ? `${r.faOdEuAgent.toFixed(2).replace('.', ',')}` : '0,00'}
                    </td>

                    {/* FA KLIENT */}
                    <td className="p-2 text-right border-r border-slate-200 font-bold text-blue-800 bg-blue-50/30 text-[12px] leading-[16px]">
                      {r.faKlient ? `${r.faKlient.toFixed(2).replace('.', ',')}` : '0,00'}
                    </td>

                    {/* INT. POZNAMKA */}
                    <td className="p-2 text-slate-500 font-sans text-[11px] border-r border-slate-200 max-w-[110px] whitespace-normal break-words leading-tight" title={r.intPoznamka}>
                      <div className="line-clamp-2">
                        {r.intPoznamka}
                      </div>
                    </td>

                    {/* ZISK */}
                    <td className="p-2 text-right border-r border-slate-200 font-extrabold text-emerald-700 bg-emerald-50/50">
                      {r.zisk ? `${r.zisk.toFixed(2).replace('.', ',')}` : '0,00'}
                    </td>

                    <td className="w-[0.9cm] min-w-[0.9cm] max-w-[0.9cm] p-0 text-center border-r border-slate-200"></td>

                    {/* CISLO FA */}
                    <td className="p-2 text-slate-700 border-r border-slate-200 font-medium">
                      {r.cisloFa}
                    </td>

                    {/* SPLATNA */}
                    <td className="p-2 text-slate-700 border-r border-slate-200">
                      {formatDateStr(r.splatna)}
                    </td>

                    {/* ZAPLATENA / ÚHRADA */}
                    <td className="p-2 text-center border-r border-slate-200">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePaid(r.id, !r.zaplatena);
                        }}
                        className="inline-flex items-center justify-center cursor-pointer p-0.5 hover:opacity-80 transition-opacity"
                        title={r.zaplatena ? 'Zaplatené (Kliknite pre zmenu)' : 'Nezaplatené (Kliknite pre zmenu)'}
                      >
                        {r.zaplatena ? (
                          <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                        ) : (
                          <span className="w-3.5 h-3.5 border border-slate-400 rounded-sm bg-white hover:border-slate-600 inline-block" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Totals Row */}
          <tfoot>
            <tr className="bg-[#dae3ed] text-slate-900 font-bold font-mono text-xs border-t-2 border-slate-300">
              <td colSpan={13} className="p-2.5 text-right uppercase tracking-wider font-sans border-r border-slate-300 text-[16px] font-bold">
                SUMÁR:
              </td>
              <td className="p-2.5 text-right border-r border-slate-300 text-slate-800 text-[14px]">
                {totalFaUkAgent.toFixed(2).replace('.', ',')}
              </td>
              <td className="p-2.5 text-right border-r border-slate-300 text-slate-800 text-[14px]">
                {totalFaEuAgent.toFixed(2).replace('.', ',')}
              </td>
              <td className="p-2.5 text-right border-r border-slate-300 text-blue-900 font-black text-[14px] bg-blue-100/50">
                {totalFaKlient.toFixed(2).replace('.', ',')}
              </td>
              <td className="p-2.5 border-r border-slate-300"></td>
              <td className="p-2.5 text-right border-r border-slate-300 text-emerald-900 font-black text-sm bg-emerald-100/60">
                {totalZisk.toFixed(2).replace('.', ',')}
              </td>
              <td className="p-2.5 border-r border-slate-300"></td>
              <td colSpan={3} className="p-2.5"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer watermark */}
      <div className="bg-slate-50 py-2.5 px-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
        <div>
          Zobrazených {paginatedRecords.length} z {filteredRecords.length} záznamov
        </div>
      </div>

      {previewRecord && (
        <RecordModal
          isOpen={true}
          onClose={() => setPreviewRecord(null)}
          onSave={() => {}}
          initialRecord={previewRecord}
          customerList={[previewRecord.zakaznik]}
          readOnly
        />
      )}

      {/* UZATVORIŤ MESIAC MODAL */}
      {isCloseModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden text-slate-900 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">UZATVORIŤ MESIAC {currentMonthYear}</h3>
                  <p className="text-[11px] text-slate-400">Archivácia dát a vytvorenie novej predlohy</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCloseModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-blue-950">
                <p className="font-medium">
                  Chystáte sa uzatvoriť colnú databázu pre mesiac <strong className="font-bold text-blue-900">{currentMonthYear}</strong>.
                </p>
              </div>

              {/* Monthly Summary Stats Box */}
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-center">
                  <span className="text-[10px] text-slate-500 block uppercase font-sans">Celkovo záznamov</span>
                  <strong className="text-base text-slate-900">{monthRecords.length}</strong>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg text-center">
                  <span className="text-[10px] text-emerald-700 block uppercase font-sans">Vypočítaný zisk</span>
                  <strong className="text-base text-emerald-800">{monthTotalProfit.toFixed(2).replace('.', ',')} €</strong>
                </div>
              </div>

              <div className="space-y-2 text-slate-600 leading-relaxed text-[11px] bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Všetky konania a ich zisky budú bezpečne zarchivované v záložke <strong>REPORTY {parseMonthYear(currentMonthYear).year}</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Plus className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>Automaticky sa vytvorí nová čisto <strong>prázdna predloha databázy</strong> pre nasledujúci mesiac.</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsCloseModalOpen(false)}
                className="px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-200 font-medium transition-colors cursor-pointer text-xs"
              >
                Zrušiť
              </button>
              <button
                onClick={() => {
                  setIsCloseModalOpen(false);
                  onCloseMonth(currentMonthYear);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg shadow-xs flex items-center gap-2 transition-all cursor-pointer text-xs"
              >
                <Check className="w-4 h-4" />
                <span>Potvrdiť & Uzatvoriť mesiac</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
