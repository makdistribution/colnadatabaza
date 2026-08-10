import React from 'react';
import { Calendar } from 'lucide-react';
import { ColnaRecord } from '../types';
import { LoadingButtonContent } from './LoadingButtonContent';
import { ClearableSearchInput } from './ClearableSearchInput';

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
        className="bg-slate-100/90 border-2 border-[#000a2f] rounded-2xl py-2 px-4 sm:px-6 shadow-xs font-sans"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        {/* 3-column row: search | centered month | date + REFRESH (abc.png) */}
        <div className="w-full grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-6 gap-y-3 text-xs">
          {/* Left: Search */}
          <div className="flex items-center justify-start w-full">
            <ClearableSearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              className="w-full max-w-[calc(15.5rem-0.5cm)] sm:w-[calc(15rem-0.5cm)] sm:max-w-none"
              inputClassName="w-full h-[2.125rem] bg-white border border-slate-300 text-slate-900 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              iconPosition="left"
            />
          </div>

          {/* Center: Month banner — flex geometric centre + em optical offset for cap-height ink */}
          <div className="flex justify-center items-center px-2">
            <div
              className="font-sans text-blue-950 font-black tracking-widest bg-white px-8 py-1.5 rounded-xl border-[3px] border-[#000a2f] shadow-sm flex items-center justify-center whitespace-nowrap leading-none"
              style={{ fontFamily: 'system-ui', fontSize: '22px', lineHeight: 1 }}
            >
              <span
                className="leading-none"
                style={{ lineHeight: 1, transform: 'translateY(-0.05em)' }}
              >
                {currentMonthYear}
              </span>
            </div>
          </div>

          {/* Right: Date + REFRESH — matched heights (abc.png) */}
          <div className="flex items-center justify-end gap-2 w-full">
            <div className="box-border h-[2.125rem] bg-white border border-[#07538e] text-blue-950 font-mono font-bold text-xs sm:text-sm px-3.5 rounded-xl shadow-2xs inline-flex items-center gap-2 whitespace-nowrap">
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Dátum: {currentDateStr}</span>
            </div>
            <button
              type="button"
              onClick={() => { void onRefreshCustoms?.(); }}
              disabled={!onRefreshCustoms || isRefreshingCustoms}
              className="box-border w-[calc(10.85rem-2cm)] h-[2.125rem] shrink-0 bg-white border-2 border-[#000a2f] text-blue-950 font-bold text-xs sm:text-sm rounded-xl shadow-2xs hover:bg-slate-50 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wide inline-flex items-center justify-center overflow-hidden"
              title="Obnoviť colnú tabuľku"
            >
              <LoadingButtonContent
                loading={isRefreshingCustoms}
                kind="refresh"
                spinnerOnly
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
