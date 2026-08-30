import React, { useEffect, useRef, useState } from 'react';
import { AdresaRecord, ColnaRecord } from '../types';
import { parseMonthYear, extractYearAndMonth } from '../utils/monthUtils';
import { resolveCustomerSkratka } from '../utils/customerSkratka';
import { formatDueDateDisplay } from '../utils/dueDate';
import { invoiceDisplayNameFromPath } from '../utils/invoiceFile';
import { RecordModal } from './RecordModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { LoadingButtonContent } from './LoadingButtonContent';
import { InvoiceEmailModal } from './InvoiceEmailModal';
import { resolveInvoicePinIcon } from '../utils/customsNotes';
import { appApi } from '../lib/appApi';

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
  Edit3,
  Copy,
  AtSign,
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
  Calendar,
  X,
  FileCheck,
  Clock
} from 'lucide-react';

interface ColnaDatagridProps {
  records: ColnaRecord[];
  customerDirectory?: AdresaRecord[];
  onAddRecord: () => void;
  onEditRecord: (record: ColnaRecord) => void;
  onCopyRecord: (record: ColnaRecord) => void;
  onDeleteRecords: (ids: string[]) => void | Promise<void>;
  onTogglePaid: (id: string, zaplatena: boolean) => void;
  onDownloadInvoice?: (recordId: string) => void;
  onSaveRecord?: (
    record: Partial<ColnaRecord>,
    invoiceFile?: File,
  ) => void | Promise<void>;
  onCustomerInvoiceEmailSent?: (record: ColnaRecord) => void;
  searchTerm: string;
  currentMonthYear: string;
  onCloseMonth: (monthYear: string, closeYear?: boolean) => Promise<void>;
  onMonthYearChange: (monthYear: string) => void;
  statusFilter: 'OFF' | 'ALL' | 'UNPAID' | 'NEW';
  setStatusFilter: (filter: 'OFF' | 'ALL' | 'UNPAID' | 'NEW') => void;
}

export const ColnaDatagrid: React.FC<ColnaDatagridProps> = ({
  records,
  customerDirectory = [],
  onAddRecord,
  onEditRecord,
  onCopyRecord,
  onDeleteRecords,
  onTogglePaid,
  onDownloadInvoice,
  onSaveRecord,
  onCustomerInvoiceEmailSent,
  searchTerm,
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
  const [isClosingMonth, setIsClosingMonth] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingRecords, setIsDeletingRecords] = useState(false);
  const [previewRecord, setPreviewRecord] = useState<ColnaRecord | null>(null);
  const [invoiceEmailRecord, setInvoiceEmailRecord] = useState<ColnaRecord | null>(null);
  const [isSendingCustomerInvoiceEmail, setIsSendingCustomerInvoiceEmail] = useState(false);
  const [customerInvoiceEmailError, setCustomerInvoiceEmailError] = useState<string | null>(null);
  const [emailSentPopupVisible, setEmailSentPopupVisible] = useState(false);
  const emailSentPopupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRecords = filteredRecords.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Always show the newest row (Supabase created_at order) on page 1 after creates/reloads.
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredRecords[0]?.id, currentMonthYear, statusFilter, activeViewTab, searchTerm]);

  useEffect(() => {
    return () => {
      if (emailSentPopupTimerRef.current) clearTimeout(emailSentPopupTimerRef.current);
    };
  }, []);

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
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteSelected = async () => {
    if (isDeletingRecords) return;
    setIsDeletingRecords(true);
    try {
      await onDeleteRecords(selectedIds);
      setSelectedIds([]);
      setIsDeleteModalOpen(false);
    } finally {
      setIsDeletingRecords(false);
    }
  };

  // Totals calculations
  const totalFaUkAgent = filteredRecords.reduce((acc, r) => acc + (r.faOdUkAgent || 0), 0);
  const totalFaEuAgent = filteredRecords.reduce((acc, r) => acc + (r.faOdEuAgent || 0), 0);
  const totalFaKlient = filteredRecords.reduce((acc, r) => acc + (r.faKlient || 0), 0);
  const totalZisk = filteredRecords.reduce((acc, r) => acc + (r.zisk || 0), 0);

  // Print uses the full current-month table (Supabase order preserved).
  const printRecords = monthRecords;
  const printTotalFaUk = printRecords.reduce((acc, r) => acc + (r.faOdUkAgent || 0), 0);
  const printTotalFaEu = printRecords.reduce((acc, r) => acc + (r.faOdEuAgent || 0), 0);
  const printTotalFaKlient = printRecords.reduce((acc, r) => acc + (r.faKlient || 0), 0);
  const printTotalZisk = printRecords.reduce((acc, r) => acc + (r.zisk || 0), 0);
  const printDateStr = (() => {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
  })();
  const formatMoney = (value: number) => value.toFixed(2).replace('.', ',');
  const handlePrint = () => {
    const { month, year } = parseMonthYear(currentMonthYear);
    const mm = String(month).padStart(2, '0');
    const yyyy = year > 0 ? String(year) : String(new Date().getFullYear());
    const previousTitle = document.title;
    document.title = `MAK DISTRIBUTION - Colná databáza ${mm}${yyyy}`;
    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener('afterprint', restoreTitle);
    };
    window.addEventListener('afterprint', restoreTitle);
    window.print();
  };

  const resolveCustomerEmails = (record: ColnaRecord): string[] => {
    const name = String(record.zakaznik || '').trim();
    if (!name) return [];
    const bySkratka = customerDirectory.find((d) => String(d.skratka || '').trim() === name);
    const byOfficial = customerDirectory.find((d) => String(d.nazovFirmy || '').trim() === name);
    const customer = bySkratka || byOfficial;
    if (!customer) return [];
    const emails = [customer.email, customer.email2, customer.email3]
      .map((value) => String(value || '').trim())
      .filter(Boolean);
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const email of emails) {
      const key = email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(email);
    }
    return unique;
  };

  const handleSendCustomerInvoiceEmail = async (payload: {
    htmlBody: string;
    fromEmail: string;
    toEmails: string[];
    ccEmails?: string[];
    bccEmail: string;
    invoicePdfPath?: string | null;
  }) => {
    if (!invoiceEmailRecord?.id || isSendingCustomerInvoiceEmail) return;
    setIsSendingCustomerInvoiceEmail(true);
    setCustomerInvoiceEmailError(null);
    try {
      const result = await appApi.sendCustomerInvoiceEmail(invoiceEmailRecord.id, payload.htmlBody, {
        fromEmail: payload.fromEmail,
        toEmails: payload.toEmails,
        ccEmails: payload.ccEmails,
        bccEmail: payload.bccEmail,
        invoicePdfPath: payload.invoicePdfPath ?? invoiceEmailRecord.invoicePdfPath,
      });
      setInvoiceEmailRecord(null);
      onCustomerInvoiceEmailSent?.(result.record);
      if (emailSentPopupTimerRef.current) clearTimeout(emailSentPopupTimerRef.current);
      setEmailSentPopupVisible(true);
      emailSentPopupTimerRef.current = setTimeout(() => {
        setEmailSentPopupVisible(false);
        emailSentPopupTimerRef.current = null;
      }, 2000);
    } catch (err) {
      setCustomerInvoiceEmailError(err instanceof Error ? err.message : 'Odoslanie emailu zlyhalo.');
    } finally {
      setIsSendingCustomerInvoiceEmail(false);
    }
  };

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
      r.zisk, `"${r.cisloFa}"`, `"${formatDueDateDisplay(r.splatna)}"`, r.zaplatena ? 'Áno' : 'Nie'
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
    <>
    <div className="bg-white border-2 border-slate-400 rounded-xl shadow-xs overflow-hidden my-2 print:hidden" style={{ zoom: '90%' }}>
      
      {/* Top Filter & Action Bar — layout matches abc.png reference; bottom pad −2mm vs table */}
      <div className="bg-slate-50 px-3.5 pt-3 pb-[calc(0.75rem-2mm)] border-b border-slate-200 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-xs">
        
        {/* Left: Add / Delete / Close month */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onAddRecord}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> PRIDAŤ ZÁZNAM
          </button>

          <button
            onClick={handleDeleteSelected}
            disabled={selectedIds.length === 0 || isDeletingRecords}
            className={`px-3.5 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer font-semibold ${
              selectedIds.length > 0
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            <LoadingButtonContent loading={isDeletingRecords} kind="delete">
              <Trash2 className="w-3.5 h-3.5" />
              <span>Vymazať {selectedIds.length > 0 && `(${selectedIds.length})`}</span>
            </LoadingButtonContent>
          </button>

          <button
            onClick={() => setIsCloseModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title={`Uzatvoriť mesiac ${currentMonthYear} a preniesť dáta do Reportov`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Uzatvoriť mesiac {currentMonthYear}</span>
          </button>
        </div>

        {/* Pagination (center when present) */}
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

        {/* Right: Aktívne / Ukončené / Všetky + CSV + Print (matches abc.png) */}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-lg border border-slate-300">
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

          <button
            onClick={handleExportCSV}
            className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium cursor-pointer shadow-2xs"
            title="Exportovať do CSV"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" /> CSV
          </button>
          <button
            onClick={handlePrint}
            className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 p-1.5 rounded-lg flex items-center justify-center cursor-pointer shadow-2xs"
            title="Tlač tabuľky"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Main Table Grid */}
      <div className="w-full overflow-x-auto min-[1600px]:overflow-x-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#dae3ed] text-black uppercase font-extrabold tracking-wider border-t-2 border-t-slate-400 border-b border-slate-300 select-none text-[16px] leading-tight font-sans">
              <th rowSpan={2} className="p-2 w-7 text-center border-r border-slate-300 text-black">
                <input
                  type="checkbox"
                  checked={paginatedRecords.length > 0 && selectedIds.length === paginatedRecords.length}
                  onChange={handleSelectAll}
                  className="rounded text-blue-600 focus:ring-0 w-3.5 h-3.5 border-slate-400"
                />
              </th>
              <th rowSpan={2} className="p-1 w-[52px] min-w-[52px] max-w-[52px] text-center border-r border-slate-300 text-black" title="Copy / Edit / Odoslať FA emailom">
                <img
                  src="/edit1.png"
                  alt="Akcia"
                  className="mx-auto block object-contain max-w-full max-h-full"
                  style={{ width: 'calc(52px - 0.5rem)', height: 'auto' }}
                />
              </th>
              <th rowSpan={2} className="p-2 min-w-[calc(172px-4mm)] border-r border-slate-300 text-black" title="Meno zákazníka">
                ZÁKAZNÍK
              </th>
              <th rowSpan={2} className="p-1 w-4 text-center border-r border-slate-300 text-black" title="Nová colnica">
                NEW
              </th>
              <th rowSpan={2} className="box-border p-1 w-[52px] min-w-[52px] max-w-[52px] text-center border-r border-slate-300 text-black" title="Odoslané na fakturáciu">
                <img src="/mail.png" alt="Email odoslaný" className="mx-auto object-contain p-0 max-w-none shrink-0" style={{ width: '40px', height: '40px' }} />
              </th>
              <th rowSpan={2} className="box-border p-1 w-[52px] min-w-[52px] max-w-[52px] text-center border-r border-slate-300 text-black" title="Úprava - odoslaná na fakturáciu">
                <img src="/edit.png" alt="OPRAVA" className="mx-auto object-contain p-0 max-w-none shrink-0" style={{ width: '40px', height: '40px' }} />
              </th>
              <th rowSpan={2} className="p-1 min-w-[60px] border-r border-slate-300 text-black" title="Dátum">
                DÁTUM
              </th>
              <th rowSpan={2} className="p-2 min-w-[111px] border-r border-slate-300 text-black" title="ŠPZ">
                ŠPZ 🚛
              </th>
              <th rowSpan={2} className="px-0 py-2 min-w-[54px] text-center border-r border-slate-300 font-sans text-black" title="Referencia na faktúru">
                REF. NA
                <br />
                FAKTÚRU
              </th>
              <th colSpan={2} className="p-1.5 text-center border-r border-b border-slate-300 text-black bg-[#DAE3ED] font-bold text-[16px] leading-[20px] font-sans" title="Z UK do EU (výber col. úkonu)">
                <img src="/uk1.png" alt="UK" className="inline-block w-5 h-5 object-contain" /> <span className="inline-block translate-y-[calc(2px-0.5mm)]">➔</span> <img src="/eu1.png" alt="EU" className="inline-block w-5 h-5 object-contain" />
              </th>
              <th colSpan={2} className="p-1.5 text-center border-r border-b border-[#bdc0e8] text-black bg-[#DAE3ED] font-bold text-[16px] leading-[20px] font-sans" title="Z EU do UK (výber col. úkonu)">
                <img src="/eu1.png" alt="EU" className="inline-block w-5 h-5 object-contain" /> <span className="inline-block translate-y-[calc(2px-0.5mm)]">➔</span> <img src="/uk1.png" alt="UK" className="inline-block w-5 h-5 object-contain" />
              </th>
              <th rowSpan={2} className="box-border py-2 px-1 w-[88px] min-w-[88px] max-w-[88px] text-center align-middle border-r border-slate-300 font-sans text-black" title="Náklady od UK agenta">
                <span className="whitespace-nowrap">FA OD UK</span>
                <br/>
                <span className="whitespace-nowrap">AGENTA</span>
              </th>
              <th rowSpan={2} className="box-border py-2 px-1 w-[86px] min-w-[86px] max-w-[86px] text-center align-middle border-r border-slate-300 font-sans text-black" title="Náklady od EU agenta">
                <span className="whitespace-nowrap">FA OD EU</span>
                <br/>
                <span className="whitespace-nowrap">AGENTA</span>
              </th>
              <th rowSpan={2} className="box-border py-2 px-1 w-[107px] min-w-[107px] max-w-[107px] text-center border-r border-slate-300 text-black" title="Suma fakturovaná zákazníkovi">
                <span className="whitespace-nowrap">FA NA</span>
                <br/>
                <span className="whitespace-nowrap">ZÁKAZNÍKA</span>
              </th>
              <th rowSpan={2} className="p-2 min-w-[85px] border-r border-slate-300 text-black" title="Interná poznámka">
                POZNÁMKA
              </th>
              <th rowSpan={2} className="box-border py-2 px-1 w-[78px] min-w-[78px] max-w-[78px] text-right border-r border-slate-300 text-black font-extrabold whitespace-nowrap" title="Zisk">
                ZISK (€)
              </th>
              <th rowSpan={2} className="w-[1.5cm] min-w-[1.5cm] max-w-[1.5cm] box-border p-0 text-center align-middle border-r border-slate-300 text-black overflow-hidden" title="Podľa ikony v riadku">
                <img
                  src="/inv.png"
                  alt="Invoice"
                  className="mx-auto block object-contain max-w-none shrink-0"
                  style={{ width: '40px', height: '40px' }}
                />
              </th>
              <th rowSpan={2} className="box-border py-2 px-1 w-[84px] min-w-[84px] max-w-[84px] text-center border-r border-slate-300 text-black" title="Číslo faktúry">
                ČÍSLO
                <br />
                FAKTÚRY
              </th>
              <th rowSpan={2} className="box-border py-2 px-1 w-[85px] min-w-[85px] max-w-[85px] border-r border-slate-300 text-black" title="Dátum splatnosti">
                SPLATNÁ
              </th>
              <th rowSpan={2} className="p-2 w-[15mm] min-w-[15mm] max-w-[15mm] box-border text-center border-r border-slate-300 text-black" title="Faktúra odoslaná zákazníkovi">
                <img
                  src="/invsend.png"
                  alt="Faktúra odoslaná zákazníkovi"
                  className="mx-auto block object-contain max-w-full"
                  style={{ width: 'calc(15mm - 1rem)', height: 'auto' }}
                />
              </th>
              <th rowSpan={2} className="p-2 w-[calc(2.5rem+4mm)] min-w-[calc(2.5rem+4mm)] max-w-[calc(2.5rem+4mm)] box-border text-center text-black" title="Stav úhrady">
                <img src="/money.png" alt="ÚHRADA" className="mx-auto max-w-none" />
              </th>
            </tr>
            <tr className="bg-slate-200 text-black font-bold select-none text-[13px] leading-[20px] border-b-2 border-slate-400 font-sans">
              <th className="p-1.5 min-w-[calc(100px-1mm)] border-r border-slate-300 text-black bg-[#F3FBFA] text-center font-sans text-[13px] leading-[20px] whitespace-nowrap">
                zaclenie v UK
              </th>
              <th className="p-1.5 min-w-[calc(100px-1mm)] border-r border-slate-300 text-black bg-[#F3FBFA] text-center font-sans text-[13px] leading-[20px] whitespace-nowrap">
                vyclenie v EU
              </th>
              <th className="p-1.5 min-w-[calc(100px-1mm)] border-r border-slate-300 text-black bg-[#F3FBFA] text-center font-sans text-[13px] leading-[20px] whitespace-nowrap">
                zaclenie v EU
              </th>
              <th className="p-1.5 min-w-[calc(100px-1mm)] border-r border-slate-300 text-black bg-[#F3FBFA] text-center font-sans text-[13px] leading-[20px] whitespace-nowrap">
                vyclenie v UK
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono text-[14px] text-slate-800">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={23} className="p-10 text-center font-sans">
                  <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto py-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-1">
                      <Plus className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-slate-800 text-sm">
                      Nová prázdna databáza pre mesiac {currentMonthYear}
                    </span>
                    <p className="text-xs text-slate-500 mb-1">
                      Predchádzajúci mesiac bol úspešne uzatvorený do Reportov. Databáza je pripravená na pridávanie nových colných konaní.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedRecords.map((r, idx) => {
                const isSelected = selectedIds.includes(r.id);
                const invoicePin = resolveInvoicePinIcon(r);
                return (
                  <tr
                    key={r.id}
                    className={`h-[1.6cm] max-h-[1.6cm] [&>td]:h-[1.6cm] [&>td]:max-h-[1.6cm] [&>td]:overflow-hidden [&>td]:align-middle transition-colors hover:bg-blue-50/50 ${
                      isSelected ? 'bg-blue-50/80' : idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'
                    }`}
                    style={{ height: '1.6cm' }}
                  >
                    {/* Checkbox */}
                    <td className="p-2 text-center border-r border-slate-200">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(r.id)}
                        className="rounded text-blue-600 focus:ring-0 w-3.5 h-3.5 border-slate-300"
                      />
                    </td>

                    {/* Copy + Edit (horizontal) with @ centred underneath */}
                    <td className="p-0 text-center border-r border-slate-200 w-[52px] min-w-[52px] max-w-[52px]">
                      <div className="flex flex-col items-center justify-center gap-0 leading-none py-0">
                        <div className="flex flex-row items-center justify-center gap-[1mm]">
                          <button
                            type="button"
                            onClick={() => onCopyRecord(r)}
                            className="text-blue-600 hover:text-blue-800 p-0 cursor-pointer inline-flex items-center justify-center"
                            title="Kopírovať záznam"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditRecord(r)}
                            className="text-blue-600 hover:text-blue-800 p-0 cursor-pointer inline-flex items-center justify-center"
                            title="Upraviť záznam"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {r.invoicePdfPath ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCustomerInvoiceEmailError(null);
                              setInvoiceEmailRecord(r);
                            }}
                            className="text-blue-600 hover:text-blue-800 mt-2.5 p-0 cursor-pointer inline-flex items-center justify-center leading-none"
                            title="Odoslať FA emailom"
                          >
                            <AtSign className="w-3.5 h-3.5" strokeWidth={2.25} />
                          </button>
                        ) : (
                          <span
                            className="text-slate-300 mt-2.5 p-0 inline-flex items-center justify-center leading-none select-none pointer-events-none"
                            aria-disabled="true"
                            title="Najprv nahrajte faktúru"
                          >
                            <AtSign className="w-3.5 h-3.5" strokeWidth={2.25} />
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Customer — opens record detail */}
                    <td className="p-2 font-mono font-bold text-[14px] text-slate-900 border-r border-slate-200">
                      <button
                        type="button"
                        onClick={() => setPreviewRecord(r)}
                        className="text-left text-slate-900 hover:text-blue-600 cursor-pointer font-mono text-[14px]"
                      >
                        {resolveCustomerSkratka(r.zakaznik, customerDirectory)}
                      </button>
                    </td>

                    {/* NEW — never together with OPRAVA */}
                    <td className="p-2 text-center border-r border-slate-200">
                      {r.isNew && !r.alert && (
                        <img src="/new1.png" alt="NEW" className="h-8 w-auto mx-auto object-contain shrink-0" title="Nové colné konanie v evidencii" />
                      )}
                    </td>

                    {/* EMAIL SENT — permanent after successful EmailJS notification */}
                    <td className="box-border p-1 w-[52px] min-w-[52px] max-w-[52px] text-center border-r border-slate-200">
                      {r.invoicingEmailSentAt && (
                        <img src="/yes.png" alt="Email odoslaný" title="Email odoslaný" className="mx-auto max-w-none object-contain" />
                      )}
                    </td>

                    {/* OPRAVA — permanent after editing an existing record */}
                    <td className="box-border p-1 w-[52px] min-w-[52px] max-w-[52px] text-center border-r border-slate-200">
                      {r.alert && (
                        <img src="/yes.png" alt="OPRAVA" title="OPRAVA" className="mx-auto max-w-none object-contain" />
                      )}
                    </td>

                    {/* Datum Colnice */}
                    <td className="px-1 py-2 text-slate-700 border-r border-slate-200 font-mono text-[14px] whitespace-nowrap">
                      {formatDateStr(r.datumColnice)}
                    </td>

                    {/* SPZ */}
                    <td className="p-2 font-bold text-slate-800 border-r border-slate-200 font-mono text-[13px] text-left">
                      {r.spz}
                    </td>

                    {/* Ref. na FA — small left indent on cell values only (header unchanged) */}
                    <td className="pl-[1ch] pr-0 py-2 text-slate-700 border-r border-slate-200 font-mono text-[13px] text-left">
                      {r.refNaFa}
                    </td>

                    {/* zaclenie v UK */}
                    <td className="box-border p-2 text-center border-r border-slate-200 bg-[#F3FBFA]">
                      <span className="inline-flex mx-auto items-center justify-center w-[23px] h-[25px]">
                        {getUkZaclenie(r) ? (
                          <img src="/yes.png" alt="" className="max-w-none object-contain translate-y-[0.5mm]" />
                        ) : null}
                      </span>
                    </td>

                    {/* vyclenie v EU */}
                    <td className="box-border p-2 text-center border-r border-slate-200 bg-[#F3FBFA]">
                      <span className="inline-flex mx-auto items-center justify-center w-[23px] h-[25px]">
                        {getEuVyclenie(r) ? (
                          <img src="/yes.png" alt="" className="max-w-none object-contain translate-y-[0.5mm]" />
                        ) : null}
                      </span>
                    </td>

                    {/* zaclenie v EU */}
                    <td className="box-border p-2 text-center border-r border-slate-200 bg-[#F3FBFA]">
                      <span className="inline-flex mx-auto items-center justify-center w-[23px] h-[25px]">
                        {getEuZaclenie(r) ? (
                          <img src="/yes.png" alt="" className="max-w-none object-contain translate-y-[0.5mm]" />
                        ) : null}
                      </span>
                    </td>

                    {/* vyclenie v UK */}
                    <td className="box-border p-2 text-center border-r border-slate-200 bg-[#F3FBFA]">
                      <span className="inline-flex mx-auto items-center justify-center w-[23px] h-[25px]">
                        {getUkVyclenie(r) ? (
                          <img src="/yes.png" alt="" className="max-w-none object-contain translate-y-[0.5mm]" />
                        ) : null}
                      </span>
                    </td>

                    {/* FA OD UK AGENT */}
                    <td className="box-border py-2 px-1 w-[88px] min-w-[88px] max-w-[88px] text-right border-r border-slate-200 text-slate-700 font-mono text-[14px] leading-[16px]">
                      {r.faOdUkAgent ? `${r.faOdUkAgent.toFixed(2).replace('.', ',')}` : '0,00'}
                    </td>

                    {/* FA OD EU AGENT */}
                    <td className="box-border py-2 px-1 w-[86px] min-w-[86px] max-w-[86px] text-right border-r border-slate-200 text-slate-700 font-mono text-[14px] leading-[16px]">
                      {r.faOdEuAgent ? `${r.faOdEuAgent.toFixed(2).replace('.', ',')}` : '0,00'}
                    </td>

                    {/* FA KLIENT */}
                    <td className="box-border py-2 px-1 w-[107px] min-w-[107px] max-w-[107px] text-right border-r border-slate-200 font-bold text-blue-800 bg-blue-50/30 font-mono text-[14px] leading-[16px]">
                      {r.faKlient ? `${r.faKlient.toFixed(2).replace('.', ',')}` : '0,00'}
                    </td>

                    {/* INT. POZNAMKA — note text always red when present */}
                    <td
                      className={`p-2 font-mono text-[14px] border-r border-slate-200 max-w-[110px] whitespace-normal break-words leading-tight ${
                        r.intPoznamka ? 'text-red-600' : 'text-slate-500'
                      }`}
                      title={r.intPoznamka}
                    >
                      <div className="line-clamp-2">
                        {r.intPoznamka}
                      </div>
                    </td>

                    {/* ZISK */}
                    <td className="box-border py-2 px-1 w-[78px] min-w-[78px] max-w-[78px] border-r border-slate-200 font-extrabold text-emerald-700 bg-emerald-50/50 font-mono text-[14px] align-middle">
                      <div className="flex items-center justify-end w-full h-full">
                        {r.zisk ? `${r.zisk.toFixed(2).replace('.', ',')}` : '0,00'}
                      </div>
                    </td>

                    <td className="w-[1.5cm] min-w-[1.5cm] max-w-[1.5cm] box-border p-0 text-center border-r border-slate-200 overflow-hidden h-[1.6cm] max-h-[1.6cm]">
                      <div className="inline-flex items-center justify-center gap-0.5 w-full h-full px-0.5">
                        {invoicePin !== 'none' && (
                          <button
                            type="button"
                            title={invoicePin === 'corrected' ? 'Oprava vystavenej faktúry' : 'Vystavená faktúra'}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDownloadInvoice?.(r.id);
                            }}
                            className="inline-flex items-center justify-center p-0.5 cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-0"
                          >
                            <img
                              src={invoicePin === 'corrected' ? '/pinnew.png' : '/pin.png'}
                              alt={invoicePin === 'corrected' ? 'Oprava vystavenej faktúry' : 'Vystavená faktúra'}
                              className="h-[44px] w-auto max-w-full mx-auto object-contain pointer-events-none"
                            />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* CISLO FA */}
                    <td className="box-border py-2 px-1 w-[84px] min-w-[84px] max-w-[84px] text-slate-700 border-r border-slate-200 font-medium font-mono text-[14px]">
                      {r.cisloFa}
                    </td>

                    {/* SPLATNA */}
                    <td className="box-border py-2 px-1 w-[85px] min-w-[85px] max-w-[85px] text-slate-700 border-r border-slate-200 font-mono text-[14px]">
                      {formatDueDateDisplay(r.splatna)}
                    </td>

                    {/* Faktúra odoslaná zákazníkovi — posli1.png after successful customer invoice email */}
                    <td className="p-2 w-[15mm] min-w-[15mm] max-w-[15mm] box-border text-center border-r border-slate-200">
                      {r.customerInvoiceEmailSentAt ? (
                        <img
                          src="/posli1.png"
                          alt="Odoslané zákazníkovi emailom"
                          title="Odoslané zákazníkovi emailom"
                          className="mx-auto max-w-none object-contain"
                        />
                      ) : null}
                    </td>

                    {/* ZAPLATENA / ÚHRADA */}
                    <td className="p-2 w-[calc(2.5rem+4mm)] min-w-[calc(2.5rem+4mm)] max-w-[calc(2.5rem+4mm)] box-border text-center border-r border-slate-200">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePaid(r.id, !r.zaplatena);
                        }}
                        className="inline-flex items-center justify-center cursor-pointer p-0.5 hover:opacity-80 transition-opacity"
                        title={r.zaplatena ? 'Uhradená' : 'Nezaplatené (Kliknite pre zmenu)'}
                      >
                        {r.zaplatena ? (
                          <img src="/yes.png" alt="Uhradená" className="max-w-none" />
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

          {/* Totals Row — height reduced by exactly 2mm vs previous p-2.5 */}
          <tfoot>
            <tr className="bg-[#dae3ed] text-slate-900 font-bold font-mono text-xs border-t-2 border-slate-400">
              <td colSpan={13} className="px-2.5 py-[calc(0.625rem-1mm)] text-right uppercase tracking-wider font-sans border-r border-slate-300 text-[16px] font-bold">
                SUMÁR:
              </td>
              <td className="px-2.5 py-[calc(0.625rem-1mm)] text-right border-r border-slate-300 font-sans text-[16px] font-bold text-slate-900">
                {totalFaUkAgent.toFixed(2).replace('.', ',')}
              </td>
              <td className="px-2.5 py-[calc(0.625rem-1mm)] text-right border-r border-slate-300 font-sans text-[16px] font-bold text-slate-900">
                {totalFaEuAgent.toFixed(2).replace('.', ',')}
              </td>
              <td className="px-2.5 py-[calc(0.625rem-1mm)] text-right border-r border-slate-300 font-sans text-[16px] font-bold text-slate-900 bg-blue-100/50">
                {totalFaKlient.toFixed(2).replace('.', ',')}
              </td>
              <td className="px-2.5 py-[calc(0.625rem-1mm)] border-r border-slate-300"></td>
              <td className="px-2.5 py-[calc(0.625rem-1mm)] border-r border-slate-300 font-sans text-[16px] font-bold text-slate-900 bg-emerald-100/60 align-middle">
                <div className="flex items-center justify-end w-full h-full">
                  {totalZisk.toFixed(2).replace('.', ',')}
                </div>
              </td>
              <td className="px-2.5 py-[calc(0.625rem-1mm)] border-r border-slate-300"></td>
              <td colSpan={4} className="px-2.5 py-[calc(0.625rem-1mm)]"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer watermark — height reduced by exactly 3mm vs previous py-2.5 */}
      <div className="bg-slate-50 py-[calc(0.625rem-1.5mm)] px-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
        <div>
          Zobrazených {paginatedRecords.length} z {filteredRecords.length} záznamov
        </div>
      </div>

      {previewRecord && (
        <RecordModal
          isOpen={true}
          onClose={() => setPreviewRecord(null)}
          onSave={async (record, invoiceFile) => {
            if (!onSaveRecord) return;
            try {
              await onSaveRecord(record, invoiceFile);
              setPreviewRecord(null);
            } catch {
              // Toast is shown by App; keep preview open for retry.
            }
          }}
          initialRecord={previewRecord}
          customerList={
            customerDirectory.length > 0
              ? customerDirectory.map((c) => c.skratka).filter(Boolean)
              : [previewRecord.zakaznik]
          }
          customerDirectory={customerDirectory}
          readOnly
        />
      )}

      {emailSentPopupVisible && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center pt-24 pointer-events-none print:hidden">
          <div className="pointer-events-none rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-2xl">
            Email bol úspešne odoslaný.
          </div>
        </div>
      )}

      <InvoiceEmailModal
        isOpen={!!invoiceEmailRecord}
        directoryEmails={invoiceEmailRecord ? resolveCustomerEmails(invoiceEmailRecord) : []}
        invoiceNumber={String(invoiceEmailRecord?.cisloFa || '').trim()}
        recordDate={invoiceEmailRecord?.datumColnice}
        attachmentName={invoiceDisplayNameFromPath(invoiceEmailRecord?.invoicePdfPath)}
        invoicePdfPath={invoiceEmailRecord?.invoicePdfPath}
        isSending={isSendingCustomerInvoiceEmail}
        sendError={customerInvoiceEmailError}
        onCancel={() => {
          if (!isSendingCustomerInvoiceEmail) {
            setInvoiceEmailRecord(null);
            setCustomerInvoiceEmailError(null);
          }
        }}
        onSend={(payload) => { void handleSendCustomerInvoiceEmail(payload); }}
      />

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        title="VYMAZAŤ ZÁZNAMY"
        message={
          <>
            Naozaj chcete vymazať{' '}
            <strong className="font-bold text-red-900">
              {selectedIds.length} {selectedIds.length === 1 ? 'označený záznam' : 'označené záznamy'}
            </strong>
            ? Túto akciu nie je možné vrátiť späť.
          </>
        }
        isLoading={isDeletingRecords}
        onCancel={() => {
          if (!isDeletingRecords) setIsDeleteModalOpen(false);
        }}
        onConfirm={() => { void confirmDeleteSelected(); }}
      />

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
                <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg flex items-center justify-center gap-2 whitespace-nowrap">
                  <span className="text-[10px] text-emerald-700 uppercase font-sans leading-none self-center">Vypočítaný zisk</span>
                  <strong className="text-base text-emerald-800 font-mono leading-none self-center">{monthTotalProfit.toFixed(2).replace('.', ',')} €</strong>
                </div>
              </div>

              <div className="space-y-2 text-slate-600 leading-relaxed text-[11px] bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex items-start gap-2">
                  <img src="/yes.png" alt="" className="max-w-none object-contain shrink-0 mt-0.5" />
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
                disabled={isClosingMonth}
                onClick={async () => {
                  const { month, year } = parseMonthYear(currentMonthYear);
                  const closeYear = month === 12;
                  if (closeYear && !window.confirm(`Chcete uzavrieť aj rok ${year}?`)) return;
                  setIsClosingMonth(true);
                  try {
                    await onCloseMonth(currentMonthYear, closeYear);
                    setIsCloseModalOpen(false);
                  } catch (error) {
                    window.alert(error instanceof Error ? error.message : 'Mesiac sa nepodarilo uzatvoriť.');
                  } finally {
                    setIsClosingMonth(false);
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg shadow-xs flex items-center gap-2 transition-all cursor-pointer text-xs disabled:cursor-wait disabled:opacity-70"
              >
                <img src="/yes.png" alt="" className="max-w-none object-contain" />
                <span>{isClosingMonth ? 'Uzatváram…' : 'Potvrdiť & Uzatvoriť mesiac'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Print-only monthly customs table (A4 landscape) */}
    <div className="hidden print:block print-customs-sheet">
      <header className="print-customs-header">
        <div className="print-customs-brand">
          <img src="/mklogo.png" alt="" />
          <div>
            <p className="print-customs-company">MAK DISTRIBUTION</p>
            <p className="print-customs-doc-type">Colná databáza</p>
          </div>
        </div>
        <div className="print-customs-meta">
          <p className="print-customs-month">{currentMonthYear}</p>
          <p className="print-customs-date">Dátum tlače: {printDateStr}</p>
        </div>
      </header>
      <table className="print-customs-table">
        <colgroup>
          <col style={{ width: '11%' }} />
          <col style={{ width: '6.5%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '6%' }} />
          <col style={{ width: '6%' }} />
          <col style={{ width: '6.5%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '4%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '6%' }} />
          <col style={{ width: '7%' }} />
        </colgroup>
        <thead>
          <tr>
            <th>Zákazník</th>
            <th>Dátum</th>
            <th>ŠPZ</th>
            <th>Ref. FA</th>
            <th>UK→EU</th>
            <th>EU→UK</th>
            <th className="num">FA UK</th>
            <th className="num">FA EU</th>
            <th className="num">FA klient</th>
            <th>Poznámka</th>
            <th className="num">Zisk</th>
            <th>Číslo FA</th>
            <th>Splatná</th>
            <th>Úhrada</th>
          </tr>
        </thead>
        <tbody>
          {printRecords.length === 0 ? (
            <tr>
              <td colSpan={14}>Žiadne záznamy pre mesiac {currentMonthYear}.</td>
            </tr>
          ) : (
            printRecords.map((r) => (
              <tr key={r.id}>
                <td>{resolveCustomerSkratka(r.zakaznik, customerDirectory)}</td>
                <td>{formatDateStr(r.datumColnice)}</td>
                <td>{r.spz}</td>
                <td>{r.refNaFa}</td>
                <td>
                  {[getUkZaclenie(r), getEuVyclenie(r)].filter(Boolean).join('; ')}
                </td>
                <td>
                  {[getEuZaclenie(r), getUkVyclenie(r)].filter(Boolean).join('; ')}
                </td>
                <td className="num">{formatMoney(r.faOdUkAgent || 0)}</td>
                <td className="num">{formatMoney(r.faOdEuAgent || 0)}</td>
                <td className="num">{formatMoney(r.faKlient || 0)}</td>
                <td>{r.intPoznamka}</td>
                <td className="num">{formatMoney(r.zisk || 0)}</td>
                <td>{r.cisloFa}</td>
                <td>{formatDueDateDisplay(r.splatna)}</td>
                <td className={r.zaplatena ? 'status-yes' : 'status-no'}>
                  {r.zaplatena ? 'Áno' : 'Nie'}
                </td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={6} className="totals-label">Sumár</td>
            <td className="num">{formatMoney(printTotalFaUk)}</td>
            <td className="num">{formatMoney(printTotalFaEu)}</td>
            <td className="num">{formatMoney(printTotalFaKlient)}</td>
            <td></td>
            <td className="num">{formatMoney(printTotalZisk)}</td>
            <td colSpan={3}></td>
          </tr>
        </tfoot>
      </table>
      <footer className="print-customs-footnote">
        <span>MAK DISTRIBUTION · interný prehľad colných konaní</span>
        <span>{printRecords.length} {printRecords.length === 1 ? 'záznam' : printRecords.length >= 2 && printRecords.length <= 4 ? 'záznamy' : 'záznamov'}</span>
      </footer>
    </div>
    </>
  );
};
