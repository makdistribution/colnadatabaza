import React from 'react';
import { Search, Calendar } from 'lucide-react';
import { ColnaRecord } from '../types';
import { parseMonthYear } from '../utils/monthUtils';
import { LoadingButtonContent } from './LoadingButtonContent';

interface QuickStatsHeaderProps {
  currentMonthYear: string; // e.g. "JÚL / 2026"
  onMonthYearChange: (my: string) => void;
  statusFilter: 'OFF' | 'ALL' | 'UNPAID' | 'NEW';
  setStatusFilter: (filter: 'OFF' | 'ALL' | 'UNPAID' | 'NEW') => void;
  records: ColnaRecord[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onRefreshCustoms?: () => void | Promise<void>;
  isRefreshingCustoms?: boolean;
}

export const QuickStatsHeader: React.FC<QuickStatsHeaderProps> = ({
  currentMonthYear,
  searchTerm,
  setSearchTerm,
  onRefreshCustoms,
  isRefreshingCustoms = false,
}) => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  const currentDateStr = `${day}.${month}.${year}`;

  return (
    <div className="bg-[#000a2f] pb-2.5 px-3 sm:px-6 lg:px-8">
      <div
        className="bg-slate-100/90 border-2 border-[#000a2f] rounded-2xl py-2.5 px-4 sm:px-5 shadow-xs font-sans"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        {/* 3-column row: search | centered month | date + REFRESH (abc.png) */}
        <div className="w-full grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs">
          {/* Left: Search */}
          <div className="flex items-center justify-start w-full">
            <div className="relative w-full max-w-[15.5rem] sm:max-w-[16.5rem]">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg pl-8 pr-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Center: Month banner */}
          <div className="flex justify-center items-center">
            <div
              className="font-sans text-blue-950 font-black tracking-widest bg-white px-8 py-1.5 rounded-xl border-[3px] border-[#000a2f] shadow-sm flex items-center justify-center whitespace-nowrap"
              style={{ fontFamily: 'system-ui', fontSize: '22px' }}
            >
              {currentMonthYear}
            </div>
          </div>

          {/* Right: Date + REFRESH */}
          <div className="flex items-center justify-end gap-2.5 w-full">
            <div className="bg-white border border-[#07538e] text-blue-950 font-mono font-bold text-xs sm:text-sm px-3.5 py-1.5 rounded-xl shadow-2xs flex items-center gap-2 whitespace-nowrap">
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Dátum: {currentDateStr}</span>
            </div>
            <button
              type="button"
              onClick={() => { void onRefreshCustoms?.(); }}
              disabled={!onRefreshCustoms || isRefreshingCustoms}
              className="box-border w-[10.85rem] h-[2.125rem] shrink-0 bg-white border border-[#07538e] text-blue-950 font-bold text-xs sm:text-sm rounded-xl shadow-2xs hover:bg-slate-50 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wide inline-flex items-center justify-center overflow-hidden"
              title="Obnoviť colnú tabuľku"
            >
              <LoadingButtonContent
                loading={isRefreshingCustoms}
                kind="refresh"
                className={isRefreshingCustoms ? 'text-[10px] sm:text-[11px]' : ''}
              >
                REFRESH
              </LoadingButtonContent>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
