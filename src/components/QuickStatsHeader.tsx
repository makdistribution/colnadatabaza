import React from 'react';
import { Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { ColnaRecord } from '../types';
import { parseMonthYear, formatMonthYear } from '../utils/monthUtils';

interface QuickStatsHeaderProps {
  currentMonthYear: string; // e.g. "JÚL / 2026"
  onMonthYearChange: (my: string) => void;
  statusFilter: 'OFF' | 'ALL' | 'UNPAID' | 'NEW';
  setStatusFilter: (filter: 'OFF' | 'ALL' | 'UNPAID' | 'NEW') => void;
  records: ColnaRecord[];
}

export const QuickStatsHeader: React.FC<QuickStatsHeaderProps> = ({
  currentMonthYear,
  onMonthYearChange,
  statusFilter,
  setStatusFilter,
  records,
}) => {
  const targetYear = parseMonthYear(currentMonthYear).year;

  const handlePrevMonth = () => {
    const { month, year } = parseMonthYear(currentMonthYear);
    let prevM = month - 1;
    let prevY = year;
    if (prevM < 1) {
      prevM = 12;
      prevY -= 1;
    }
    onMonthYearChange(formatMonthYear(prevM, prevY));
  };

  const handleNextMonth = () => {
    const { month, year } = parseMonthYear(currentMonthYear);
    let nextM = month + 1;
    let nextY = year;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    onMonthYearChange(formatMonthYear(nextM, nextY));
  };

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
    <div className="bg-slate-100 border-b border-slate-200 py-2.5 px-4 sm:px-6 lg:px-8">
      <div className="w-full grid grid-cols-1 md:grid-cols-3 items-center gap-3 text-xs">
        
        {/* Left spacer for desktop alignment balance */}
        <div className="hidden md:block"></div>

        {/* Centered Month Display with Navigation */}
        <div className="flex justify-center items-center gap-1.5">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer transition-colors"
            title="Predchádzajúci mesiac"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-slate-900 font-bold text-xs tracking-wider bg-white px-3 py-1 rounded-md border border-slate-200 shadow-2xs">
            {currentMonthYear}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer transition-colors"
            title="Nasledujúci mesiac"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Status Filter Pills: Nové, Nezaplatené, Všetky (doplnkový filter) */}
        <div className="flex items-center justify-center md:justify-end gap-1.5">
          <span className="text-slate-500 font-semibold mr-1 flex items-center gap-1 text-[11px]">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Doplnkový filter:
          </span>
          <button
            onClick={() => setStatusFilter(statusFilter === 'NEW' ? 'OFF' : 'NEW')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
              statusFilter === 'NEW'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
            title="Doplnkový filter: Zobraziť len nové záznamy"
          >
            Nové ({newCount})
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'UNPAID' ? 'OFF' : 'UNPAID')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
              statusFilter === 'UNPAID'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
            title="Doplnkový filter: Zobraziť nezaplatené za celý rok"
          >
            Nezaplatené ({unpaidCount})
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'ALL' ? 'OFF' : 'ALL')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
            title="Doplnkový filter: Zobraziť všetky colnice za celý rok"
          >
            Všetky ({allCount})
          </button>
        </div>

      </div>
    </div>
  );
};
