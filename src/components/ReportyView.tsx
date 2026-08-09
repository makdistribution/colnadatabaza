import React, { useState } from 'react';
import { AdresaRecord, ColnaRecord, MonthlyReport } from '../types';
import { extractYearAndMonth, MONTH_NAMES } from '../utils/monthUtils';
import { resolveCustomerSkratka } from '../utils/customerSkratka';
import {
  JULY_2026_OVERRIDE_PROFIT,
  JULY_2026_OVERRIDE_REVENUE,
  JULY_2026_REPORT_RECORDS,
} from '../data/july2026ReportOverride';
import { formatDueDateDisplay } from '../utils/dueDate';
import { BarChart3, ChevronDown, ChevronRight, TrendingUp, Clock } from 'lucide-react';

const hasUkZaclenie = (r: ColnaRecord) => {
  const lower = (r.ukToEu || '').toLowerCase();
  return lower.includes('zaclenie v uk') || lower.includes('uk zaclenie');
};
const hasEuVyclenie = (r: ColnaRecord) => {
  const lower = (r.ukToEu || '').toLowerCase();
  return lower.includes('vyclenie v eu') || lower.includes('eu vyclenie');
};
const hasEuZaclenie = (r: ColnaRecord) => {
  const lower = (r.euToUk || '').toLowerCase();
  return lower.includes('zaclenie v eu') || lower.includes('eu zaclenie');
};
const hasUkVyclenie = (r: ColnaRecord) => {
  const lower = (r.euToUk || '').toLowerCase();
  return lower.includes('vyclenie v uk') || lower.includes('uk vyclenie');
};

interface ReportyViewProps {
  records: ColnaRecord[];
  reports: MonthlyReport[];
  year: number;
  onYearChange?: (year: number) => void;
  availableYears?: number[];
  searchTerm?: string;
  customerDirectory?: AdresaRecord[];
}

const recordMatchesSearch = (record: ColnaRecord, term: string) => {
  if (!term) return true;
  const needle = term.toLowerCase();
  return (
    record.zakaznik.toLowerCase().includes(needle) ||
    record.spz.toLowerCase().includes(needle) ||
    record.refNaFa.toLowerCase().includes(needle) ||
    record.cisloFa.toLowerCase().includes(needle) ||
    record.ukToEu.toLowerCase().includes(needle) ||
    record.euToUk.toLowerCase().includes(needle) ||
    record.intPoznamka.toLowerCase().includes(needle) ||
    record.datumColnice.toLowerCase().includes(needle)
  );
};

const formatMoney = (val: number) => {
  const formatted = val.toFixed(2);
  const parts = formatted.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return parts.join(',');
};

/** Slovak plural for "colné konanie" used in monthly report headers. */
const formatColneKonaniaCount = (count: number): string => {
  const n = Math.abs(Math.trunc(count));
  const lastTwo = n % 100;
  const last = n % 10;

  if (lastTwo >= 11 && lastTwo <= 14) {
    return `${n} colných konaní`;
  }
  if (last === 1) {
    return `${n} colné konanie`;
  }
  if (last >= 2 && last <= 4) {
    return `${n} colné konania`;
  }
  return `${n} colných konaní`;
};

export const ReportyView: React.FC<ReportyViewProps> = ({
  records,
  reports,
  year,
  onYearChange,
  availableYears,
  searchTerm = '',
  customerDirectory = [],
}) => {
  const [collapsedMonths, setCollapsedMonths] = useState<Record<number, boolean>>({});

  const yearList = availableYears && availableYears.length > 0 ? availableYears : [year];

  const yearReports = reports.filter((report) => report.year === year);
  const reportedMonths = new Set(yearReports.map((report) => report.month));

  // Reports contain only records from months that have been closed.
  const yearRecords = records.filter((r) => {
    const ym = extractYearAndMonth(r.datumColnice);
    return ym ? ym.year === year && reportedMonths.has(ym.month) : false;
  });

  // ONE-TIME historical correction for REPORTY 2026 year totals:
  // replace real July 2026 closed-month data with the approved reference set.
  const applyJuly2026YearCorrection = year === 2026 && reportedMonths.has(7);
  const displayYearRecords = applyJuly2026YearCorrection
    ? [
        ...yearRecords.filter((r) => {
          const ym = extractYearAndMonth(r.datumColnice);
          return !(ym && ym.month === 7);
        }),
        ...JULY_2026_REPORT_RECORDS,
      ]
    : yearRecords;

  // Group by month (0 = Jan, 11 = Dec)
  const monthlyGroups = MONTH_NAMES.map((name, index) => {
    const monthRecords = yearRecords.filter((r) => {
      const ym = extractYearAndMonth(r.datumColnice);
      return ym ? ym.month === index + 1 : false;
    });

    const report = yearReports.find((item) => item.month === index + 1);

    // ONE-TIME correction: JÚL / 2026 uses the approved reference contents.
    const isJuly2026Override = year === 2026 && index === 6;
    const baseDisplayRecords = isJuly2026Override ? JULY_2026_REPORT_RECORDS : monthRecords;
    const displayRecords = baseDisplayRecords.filter((record) => recordMatchesSearch(record, searchTerm));
    const totalProfit = isJuly2026Override
      ? JULY_2026_OVERRIDE_PROFIT
      : report?.totalProfit || 0;
    const totalRevenue = isJuly2026Override
      ? JULY_2026_OVERRIDE_REVENUE
      : report?.totalRevenue || 0;

    return {
      monthIndex: index,
      monthName: name,
      records: displayRecords,
      totalProfit,
      totalRevenue,
      totalCosts: report?.totalCosts || 0,
      hasSearchMatches: displayRecords.length > 0,
    };
  }).filter((g) => reportedMonths.has(g.monthIndex + 1))
    .filter((g) => !searchTerm || g.hasSearchMatches)
    // Newest month at top, oldest (JANUARY) at bottom — years stay unchanged.
    .slice()
    .reverse();

  const totalYearProfit = yearReports.reduce((acc, report) => {
    if (applyJuly2026YearCorrection && report.month === 7) {
      return acc + JULY_2026_OVERRIDE_PROFIT;
    }
    return acc + report.totalProfit;
  }, 0);
  const totalYearRevenue = yearReports.reduce((acc, report) => {
    if (applyJuly2026YearCorrection && report.month === 7) {
      return acc + JULY_2026_OVERRIDE_REVENUE;
    }
    return acc + report.totalRevenue;
  }, 0);
  const unpaidCount = displayYearRecords.filter((r) => !r.zaplatena).length;

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
              Celkovo colných konaní: <strong className="text-slate-900">{displayYearRecords.length}</strong>
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
                      ({formatColneKonaniaCount(group.records.length)})
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

                {/* Table for this Month — standard header for all monthly reports */}
                {!isCollapsed && (() => {
                  const totalFaUk = group.records.reduce((acc, r) => acc + (r.faOdUkAgent || 0), 0);
                  const totalFaEu = group.records.reduce((acc, r) => acc + (r.faOdEuAgent || 0), 0);
                  const totalFaKlient = group.records.reduce((acc, r) => acc + (r.faKlient || 0), 0);
                  const totalZisk = group.records.reduce((acc, r) => acc + (r.zisk || 0), 0);

                  return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#dae3ed] text-black uppercase font-bold tracking-wider border-b border-slate-300 text-[11px] font-sans">
                          <th rowSpan={2} className="p-2 min-w-[120px] border-r border-slate-300 text-black align-middle">ZÁKAZNÍK</th>
                          <th rowSpan={2} className="p-2 min-w-[90px] border-r border-slate-300 text-black align-middle">DÁTUM COLNICE</th>
                          <th rowSpan={2} className="p-2 min-w-[110px] border-r border-slate-300 text-black align-middle whitespace-nowrap">
                            ŠPZ 🚛
                          </th>
                          <th rowSpan={2} className="p-2 min-w-[90px] border-r border-slate-300 text-black align-middle">REF. NA FA.</th>
                          <th colSpan={2} className="p-1.5 text-center border-r border-b border-slate-300 text-black bg-blue-100 font-bold">
                            <img src="/uk1.png" alt="UK" className="inline-block w-4 h-4 object-contain" />{' '}
                            <span className="inline-block translate-y-[1px]">➔</span>{' '}
                            <img src="/eu1.png" alt="EU" className="inline-block w-4 h-4 object-contain" />
                          </th>
                          <th colSpan={2} className="p-1.5 text-center border-r border-b border-slate-300 text-black bg-[#dbeafe] font-bold">
                            <img src="/eu1.png" alt="EU" className="inline-block w-4 h-4 object-contain" />{' '}
                            <span className="inline-block translate-y-[1px]">➔</span>{' '}
                            <img src="/uk1.png" alt="UK" className="inline-block w-4 h-4 object-contain" />
                          </th>
                          <th rowSpan={2} className="p-2 text-right border-r border-slate-300 text-black align-middle whitespace-nowrap">FA OD UK AGENT</th>
                          <th rowSpan={2} className="p-2 text-right border-r border-slate-300 text-black align-middle whitespace-nowrap">FA OD EU AGENT</th>
                          <th rowSpan={2} className="p-2 text-right border-r border-slate-300 text-black align-middle whitespace-nowrap">FA. KLIENT</th>
                          <th rowSpan={2} className="p-2 min-w-[110px] border-r border-slate-300 text-black align-middle">INT. POZNÁMKA</th>
                          <th rowSpan={2} className="p-2 text-right border-r border-slate-300 text-emerald-800 font-extrabold align-middle">ZISK</th>
                          <th rowSpan={2} className="p-2 min-w-[80px] border-r border-slate-300 text-black align-middle">ČÍSLO FA.</th>
                          <th rowSpan={2} className="p-2 min-w-[70px] border-r border-slate-300 text-black align-middle">SPLATNÁ</th>
                          <th rowSpan={2} className="p-2 text-center w-16 text-black align-middle">ZAPLATENÁ</th>
                        </tr>
                        <tr className="bg-slate-200 text-black font-bold border-b-2 border-slate-400 text-[11px] font-sans">
                          <th className="p-1.5 border-r border-slate-300 text-center bg-blue-50/80 whitespace-nowrap">zaclenie v UK</th>
                          <th className="p-1.5 border-r border-slate-300 text-center bg-blue-50/80 whitespace-nowrap">vyclenie v EU</th>
                          <th className="p-1.5 border-r border-slate-300 text-center bg-emerald-50/80 whitespace-nowrap">zaclenie v EU</th>
                          <th className="p-1.5 border-r border-slate-300 text-center bg-emerald-50/80 whitespace-nowrap">vyclenie v UK</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-black">
                        {group.records.map((r, idx) => (
                          <tr key={r.id} className={`transition-colors hover:bg-blue-100/60 ${idx % 2 === 1 ? 'bg-slate-100/80' : 'bg-white'}`}>
                            <td className="p-2 font-sans font-bold text-black border-r border-slate-300">
                              {resolveCustomerSkratka(r.zakaznik, customerDirectory)}
                            </td>
                            <td className="p-2 text-black border-r border-slate-300 whitespace-nowrap">
                              {formatDateStr(r.datumColnice)}
                            </td>
                            <td className="p-2 font-bold text-black border-r border-slate-300">
                              {r.spz}
                            </td>
                            <td className="p-2 text-black border-r border-slate-300 text-left">
                              {r.refNaFa}
                            </td>
                            <td className="p-2 text-center border-r border-slate-300 bg-blue-50/30">
                              {hasUkZaclenie(r) ? <img src="/yes.png" alt="" className="max-w-none mx-auto object-contain" /> : null}
                            </td>
                            <td className="p-2 text-center border-r border-slate-300 bg-blue-50/30">
                              {hasEuVyclenie(r) ? <img src="/yes.png" alt="" className="max-w-none mx-auto object-contain" /> : null}
                            </td>
                            <td className="p-2 text-center border-r border-slate-300 bg-emerald-50/30">
                              {hasEuZaclenie(r) ? <img src="/yes.png" alt="" className="max-w-none mx-auto object-contain" /> : null}
                            </td>
                            <td className="p-2 text-center border-r border-slate-300 bg-emerald-50/30">
                              {hasUkVyclenie(r) ? <img src="/yes.png" alt="" className="max-w-none mx-auto object-contain" /> : null}
                            </td>
                            <td className="p-2 text-right border-r border-slate-300 text-black">
                              {(r.faOdUkAgent || 0).toFixed(2).replace('.', ',')}
                            </td>
                            <td className="p-2 text-right border-r border-slate-300 text-black">
                              {(r.faOdEuAgent || 0).toFixed(2).replace('.', ',')}
                            </td>
                            <td className="p-2 text-right border-r border-slate-300 font-bold text-black bg-blue-50/30">
                              {(r.faKlient || 0).toFixed(2).replace('.', ',')}
                            </td>
                            <td className="p-2 text-black border-r border-slate-300 font-sans text-[11px]">
                              {r.intPoznamka}
                            </td>
                            <td className="p-2 text-right border-r border-slate-300 font-extrabold text-emerald-700 bg-emerald-50/50">
                              {(r.zisk || 0).toFixed(2).replace('.', ',')}
                            </td>
                            <td className="p-2 text-black border-r border-slate-300 font-medium">
                              {r.cisloFa}
                            </td>
                            <td className="p-2 text-black border-r border-slate-300">
                              {formatDueDateDisplay(r.splatna)}
                            </td>
                            <td className="p-2 text-center">
                              {r.zaplatena ? (
                                <img src="/yes.png" alt="Zaplatené" className="max-w-none mx-auto object-contain" />
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-[#dae3ed] text-slate-900 font-bold font-mono text-xs border-t-2 border-slate-300">
                          <td colSpan={8} className="p-2.5 text-right uppercase tracking-wider font-sans border-r border-slate-300">
                            SUMÁR:
                          </td>
                          <td className="p-2.5 text-right border-r border-slate-300">
                            {formatMoney(totalFaUk)}
                          </td>
                          <td className="p-2.5 text-right border-r border-slate-300">
                            {formatMoney(totalFaEu)}
                          </td>
                          <td className="p-2.5 text-right border-r border-slate-300 text-blue-900 bg-blue-100/50">
                            {formatMoney(totalFaKlient)}
                          </td>
                          <td className="p-2.5 border-r border-slate-300"></td>
                          <td className="p-2.5 text-right border-r border-slate-300 text-emerald-900 bg-emerald-100/60">
                            {formatMoney(totalZisk)}
                          </td>
                          <td colSpan={3} className="p-2.5"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  );
                })()}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
