import React, { useState } from 'react';
import { ColnaRecord, MonthlyReport } from '../types';
import { extractYearAndMonth, MONTH_NAMES } from '../utils/monthUtils';
import { BarChart3, ChevronDown, ChevronRight, DollarSign, Calendar, TrendingUp, CheckCircle, Clock } from 'lucide-react';

interface ReportyViewProps {
  records: ColnaRecord[];
  reports: MonthlyReport[];
  year: number;
  onYearChange?: (year: number) => void;
  availableYears?: number[];
}

const formatMoney = (val: number) => {
  const formatted = val.toFixed(2);
  const parts = formatted.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return parts.join(',');
};

export const ReportyView: React.FC<ReportyViewProps> = ({ records, reports, year, onYearChange, availableYears }) => {
  const [collapsedMonths, setCollapsedMonths] = useState<Record<number, boolean>>({});

  const yearList = availableYears && availableYears.length > 0 ? availableYears : [2026, 2025];

  const yearReports = reports.filter((report) => report.year === year);
  const reportedMonths = new Set(yearReports.map((report) => report.month));

  // Reports contain only records from months that have been closed.
  const yearRecords = records.filter((r) => {
    const ym = extractYearAndMonth(r.datumColnice);
    return ym ? ym.year === year && reportedMonths.has(ym.month) : false;
  });

  // Group by month (0 = Jan, 11 = Dec)
  const monthlyGroups = MONTH_NAMES.map((name, index) => {
    const monthRecords = yearRecords.filter((r) => {
      const ym = extractYearAndMonth(r.datumColnice);
      return ym ? ym.month === index + 1 : false;
    });

    const report = yearReports.find((item) => item.month === index + 1);

    return {
      monthIndex: index,
      monthName: name,
      records: monthRecords,
      totalProfit: report?.totalProfit || 0,
      totalRevenue: report?.totalRevenue || 0,
      totalCosts: report?.totalCosts || 0,
    };
  }).filter((g) => reportedMonths.has(g.monthIndex + 1));

  const totalYearProfit = yearReports.reduce((acc, report) => acc + report.totalProfit, 0);
  const totalYearRevenue = yearReports.reduce((acc, report) => acc + report.totalRevenue, 0);
  const unpaidCount = yearRecords.filter(r => !r.zaplatena).length;

  const toggleMonth = (index: number) => {
    setCollapsedMonths(prev => ({ ...prev, [index]: !prev[index] }));
  };

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

  return (
    <div className="space-y-6 my-4">
      
      {/* Top Year Analytics Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                MESAČNÉ PREHĽADY & REPORTY ZISKU — {year}
              </h2>
              <p className="text-xs text-slate-500">
                Súhrnný prehľad colných konaní, faktúrovaných čiastok a čistého zisku za rok {year}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onYearChange && (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 mr-2">
                {yearList.map((y) => (
                  <button
                    key={y}
                    onClick={() => onYearChange(y)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      year === y 
                        ? 'bg-blue-600 text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ROK {y}
                  </button>
                ))}
              </div>
            )}
            <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-mono font-semibold border border-slate-200">
              Celkovo konaní: <strong className="text-slate-900">{yearRecords.length}</strong>
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 text-xs">
          <div className="bg-slate-50 border-2 border-slate-400 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-slate-500 font-semibold block mb-0.5">CELKOVÝ ZISK {year}</span>
              <span className="text-xl font-black text-emerald-600 font-mono">
                {formatMoney(totalYearProfit)} €
              </span>
            </div>
            <TrendingUp className="w-7 h-7 text-emerald-500/30" />
          </div>

          <div className="bg-slate-50 border-2 border-slate-400 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-slate-500 font-semibold block mb-0.5">CELKOVÉ TRŽBY (KLIENTI)</span>
              <span className="text-xl font-black text-blue-600 font-mono">
                {formatMoney(totalYearRevenue)} €
              </span>
            </div>
            <span className="text-2xl font-black text-blue-500/40 select-none font-sans">€</span>
          </div>

          <div className="bg-slate-50 border-2 border-slate-400 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-slate-500 font-semibold block mb-0.5">NEZAPLATENÉ FAKTÚRY</span>
              <span className={`text-xl font-black font-mono ${unpaidCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {unpaidCount} ks
              </span>
            </div>
            <Clock className="w-7 h-7 text-amber-500/30" />
          </div>
        </div>
      </div>

      {/* Monthly Sections Grouping */}
      <div className="space-y-4">
        {monthlyGroups.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 rounded-xl text-center text-slate-400 text-xs shadow-2xs">
            Žiadne záznamy pre rok {year}.
          </div>
        ) : (
          monthlyGroups.map((group) => {
            const isCollapsed = !!collapsedMonths[group.monthIndex];
            const profitFormatted = formatMoney(group.totalProfit);
            const twoThirdsProfit = group.totalProfit * (2 / 3);
            const twoThirdsFormatted = formatMoney(twoThirdsProfit);

            return (
              <div key={group.monthIndex} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                
                {/* Month Header Banner */}
                <button
                  onClick={() => toggleMonth(group.monthIndex)}
                  className="w-full bg-slate-100 hover:bg-slate-200/70 px-5 py-3 border-b border-slate-200 flex items-center justify-between text-xs transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5">
                    {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />}
                    <span className="font-bold text-slate-900 uppercase tracking-tight text-sm">
                      {group.monthName} {year}
                    </span>
                    <span className="text-slate-600 text-xs font-mono ml-2">
                      ({group.records.length} konaní)
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold px-3 py-1 rounded-md font-mono text-xs flex items-center gap-1.5 shadow-2xs whitespace-nowrap">
                      <span className="text-emerald-900 font-extrabold">ZISK: € {profitFormatted}</span>
                      <span className="text-emerald-900 font-sans mx-0.5 font-bold">➜</span>
                      <span className="text-emerald-900 font-extrabold">€ {twoThirdsFormatted} (poslať na účet)</span>
                    </div>
                  </div>
                </button>

                {/* Table for this Month */}
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#dae3ed] text-black uppercase font-bold tracking-wider border-b-2 border-slate-400 text-[10px]">
                          <th className="p-2.5 min-w-[120px] border-r border-slate-300 text-black">ZÁKAZNÍK</th>
                          <th className="p-2.5 min-w-[100px] border-r border-slate-300 text-black">DÁTUM COLNICE</th>
                          <th className="p-2.5 min-w-[120px] border-r border-slate-300 text-black">ŠPZ 🚛</th>
                          <th className="p-2.5 min-w-[120px] border-r border-slate-300 text-black">REF. NA FA.</th>
                          <th className="p-2.5 min-w-[120px] border-r border-slate-300 text-black">UK ➔ EU</th>
                          <th className="p-2.5 min-w-[120px] border-r border-slate-300 text-black">EU ➔ UK</th>
                          <th className="p-2.5 text-right border-r border-slate-300 text-black">NÁKLADY UK AGENT</th>
                          <th className="p-2.5 text-right border-r border-slate-300 text-black">NÁKLADY EU AGENT</th>
                          <th className="p-2.5 text-right border-r border-slate-300 text-black">FA. ➔ KLIENT</th>
                          <th className="p-2.5 text-right border-r border-slate-300 text-emerald-800 font-extrabold">ZISK</th>
                          <th className="p-2.5 min-w-[90px] border-r border-slate-300 text-black">ČÍSLO FA.</th>
                          <th className="p-2.5 min-w-[90px] border-r border-slate-300 text-black">SPLATNÁ</th>
                          <th className="p-2.5 text-center w-16 text-black">ZAPLATENÁ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-black">
                        {group.records.map((r, idx) => (
                          <tr key={r.id} className={`transition-colors hover:bg-blue-100/60 ${idx % 2 === 1 ? 'bg-slate-100/80' : 'bg-white'}`}>
                            <td className="p-2 font-sans font-bold text-black border-r border-slate-300">
                              {r.zakaznik}
                            </td>
                            <td className="p-2 text-black border-r border-slate-300">
                              {formatDateStr(r.datumColnice)}
                            </td>
                            <td className="p-2 font-bold text-black border-r border-slate-300">
                              {r.spz}
                            </td>
                            <td className="p-2 text-black border-r border-slate-300">
                              {r.refNaFa}
                            </td>
                            <td className="p-2 text-black border-r border-slate-300 font-sans text-[11px] font-medium">
                              {r.ukToEu}
                            </td>
                            <td className="p-2 text-black border-r border-slate-300 font-sans text-[11px] font-medium">
                              {r.euToUk}
                            </td>
                            <td className="p-2 text-right border-r border-slate-300 text-black">
                              {r.faOdUkAgent ? `${r.faOdUkAgent.toFixed(2).replace('.', ',')}` : '0,00'}
                            </td>
                            <td className="p-2 text-right border-r border-slate-300 text-black">
                              {r.faOdEuAgent ? `${r.faOdEuAgent.toFixed(2).replace('.', ',')}` : '0,00'}
                            </td>
                            <td className="p-2 text-right border-r border-slate-300 font-bold text-black bg-blue-50/30">
                              {r.faKlient ? `${r.faKlient.toFixed(2).replace('.', ',')}` : '0,00'}
                            </td>
                            <td className="p-2 text-right border-r border-slate-300 font-extrabold text-emerald-700 bg-emerald-50/50">
                              {r.zisk ? `${r.zisk.toFixed(2).replace('.', ',')}` : '0,00'}
                            </td>
                            <td className="p-2 text-black border-r border-slate-300 font-medium">
                              {r.cisloFa}
                            </td>
                            <td className="p-2 text-black border-r border-slate-300">
                              {formatDateStr(r.splatna)}
                            </td>
                            <td className="p-2 text-center">
                              {r.zaplatena ? (
                                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">Áno</span>
                              ) : (
                                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">Nie</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
