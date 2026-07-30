import React from 'react';
import { Search, Calendar } from 'lucide-react';
import { ColnaRecord } from '../types';
import { parseMonthYear } from '../utils/monthUtils';

interface QuickStatsHeaderProps {
  currentMonthYear: string; // e.g. "JÚL / 2026"
  onMonthYearChange: (my: string) => void;
  statusFilter: 'OFF' | 'ALL' | 'UNPAID' | 'NEW';
  setStatusFilter: (filter: 'OFF' | 'ALL' | 'UNPAID' | 'NEW') => void;
  records: ColnaRecord[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onResetData?: () => void;
}

export const QuickStatsHeader: React.FC<QuickStatsHeaderProps> = ({
  currentMonthYear,
  statusFilter,
  setStatusFilter,
  records,
  searchTerm,
  setSearchTerm,
  onResetData,
}) => {
  const targetYear = parseMonthYear(currentMonthYear).year;

  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  const currentDateStr = `${day}.${month}.${year}`;

  const recordMatchesYear = (recordDateStr: string) => {
    if (!recordDateStr) return true;
    if (recordDateStr.includes('-')) {
      const [y] = recordDateStr.split('-');
      return parseInt(y, 10) === targetYear;
    } else if (recordDateStr.includes('.')) {
      const parts = recordDateStr.split('.').map(p => p.trim());
      if (parts.length >= 3) {
        return parseInt(parts[2], 10) === targetYear;
      }
    }
    return true;
  };

  const newCount = records.filter(r => r.isNew).length;
  const unpaidCount = records.filter(r => recordMatchesYear(r.datumColnice) && !r.zaplatena).length;
  const allCount = records.filter(r => recordMatchesYear(r.datumColnice)).length;

  return (
    <div className="bg-[#000a2f] pb-2.5 px-3 sm:px-6 lg:px-8">
      <div className="bg-slate-100/90 border-2 border-[#000a2f] rounded-2xl py-2 px-4 sm:px-6 shadow-xs font-sans" style={{ fontFamily: 'system-ui, sans-serif' }}>
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          
          {/* Left: Search input & Reset button */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-48 sm:w-60">
              <input
                type="text"
                placeholder="Hľadať v databáze..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg pl-8 pr-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 font-medium"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
            {onResetData && (
              <button
                onClick={onResetData}
                className="px-3 py-1.5 text-xs bg-white hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg transition-colors font-semibold cursor-pointer shrink-0 shadow-2xs"
                title="Obnoviť pôvodné dáta"
              >
                Reset
              </button>
            )}
          </div>

          {/* Centered Month Display */}
          <div className="flex justify-center items-center my-1 md:my-0">
            <div className="font-sans text-blue-950 font-black text-[22px] tracking-widest bg-white px-8 py-1.5 rounded-xl border-3 border-[#000a2f] shadow-sm flex items-center justify-center" style={{ fontFamily: 'system-ui', fontSize: '22px' }}>
              {currentMonthYear}
            </div>
          </div>

          {/* Right side: Current date */}
          <div className="flex items-center justify-center md:justify-end gap-2 w-full md:w-auto">
            <div className="bg-white border-2 border-white text-blue-950 font-mono font-bold text-xs sm:text-sm px-3.5 py-1 rounded-xl shadow-2xs flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Dátum: {currentDateStr}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
