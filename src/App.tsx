import React, { useState, useEffect, useRef } from 'react';
import { 
  ColnaRecord, 
  AppBootstrap,
  AppDocument,
  MonthlyReport,
  AdresaRecord, 
  LoginRecord, 
  InfoFaRecord, 
  CennikRecord,
  ActiveTab 
} from './types';
import { parseMonthYear, formatMonthYear } from './utils/monthUtils';
import { Header } from './components/Header';
import { QuickStatsHeader } from './components/QuickStatsHeader';
import { ColnaDatagrid } from './components/ColnaDatagrid';
import { RecordModal } from './components/RecordModal';
import { AdresyView } from './components/AdresyView';
import { LoginUdajeView } from './components/LoginUdajeView';
import { InfoFaView } from './components/InfoFaView';
import { CennikView } from './components/CennikView';
import { ReportyView } from './components/ReportyView';
import { SuboryView } from './components/SuboryView';
import { ColnicaEmptyView } from './components/ColnicaEmptyView';
import { appApi } from './lib/appApi';

const BROWSER_DATA_KEYS = [
  'mak_adresy_records',
  'mak_login_records',
  'mak_info_fa_records',
  'mak_colna_records',
  'mak_customs_creation_order',
] as const;

const readLocalJsonArray = <T,>(key: string): T[] | undefined => {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return undefined;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as T[]) : undefined;
  } catch {
    return undefined;
  }
};

const clearBrowserBusinessData = () => {
  for (const key of BROWSER_DATA_KEYS) {
    localStorage.removeItem(key);
  }
};

export default function App() {
  const [pendingInvoiceToken] = useState(
    () => new URLSearchParams(window.location.search).get('invoiceToken'),
  );
  const [colnaRecords, setColnaRecords] = useState<ColnaRecord[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [activeReportYear, setActiveReportYear] = useState(0);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const [adresyRecords, setAdresyRecords] = useState<AdresaRecord[]>([]);
  const [loginRecords, setLoginRecords] = useState<LoginRecord[]>([]);
  const [infoFaRecords, setInfoFaRecords] = useState<InfoFaRecord[]>([]);
  const [cennikRecords, setCennikRecords] = useState<CennikRecord[]>([]);
  const [documents, setDocuments] = useState<AppDocument[]>([]);

  const [activeTab, setActiveTab] = useState<ActiveTab>('COLNA_DATABAZA');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMonthYear, setCurrentMonthYear] = useState('');
  const [statusFilter, setStatusFilter] = useState<'OFF' | 'ALL' | 'UNPAID' | 'NEW'>('OFF');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);
  const toastDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isApplicationLocked, setIsApplicationLocked] = useState(true);
  const [applicationPassword, setApplicationPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [applicationError, setApplicationError] = useState('');
  const [isRefreshingCustoms, setIsRefreshingCustoms] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const showToastSuccess = (msg: string, durationMs = 6000) => {
    if (toastDismissTimerRef.current) clearTimeout(toastDismissTimerRef.current);
    setToastError(null);
    setToastMessage(msg);
    toastDismissTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastDismissTimerRef.current = null;
    }, durationMs);
  };

  const showToastError = (msg: string, durationMs = 9000) => {
    if (toastDismissTimerRef.current) clearTimeout(toastDismissTimerRef.current);
    setToastMessage(null);
    setToastError(msg);
    toastDismissTimerRef.current = setTimeout(() => {
      setToastError(null);
      toastDismissTimerRef.current = null;
    }, durationMs);
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingColnaRecord, setEditingColnaRecord] = useState<ColnaRecord | null>(null);
  const [isCopyMode, setIsCopyMode] = useState(false);
  /** Opened via ?invoiceToken= — show as NOVÝ ZÁZNAM (accountant invoice handoff). */
  const [isInvoiceHandoff, setIsInvoiceHandoff] = useState(false);

  const applyBootstrap = (bootstrap: AppBootstrap) => {
    const [year, month] = bootstrap.activeMonth.split('-').map(Number);
    setCurrentMonthYear(formatMonthYear(month, year));
    setActiveReportYear(bootstrap.activeReportYear);
    // Order comes from Supabase (created_at desc). Do not reorder on the client.
    setColnaRecords(bootstrap.records);
    setMonthlyReports(bootstrap.reports);
    setAdresyRecords(bootstrap.adresyRecords || []);
    setLoginRecords(bootstrap.loginRecords || []);
    setInfoFaRecords(bootstrap.infoFaRecords || []);
    setCennikRecords(bootstrap.cennikRecords || []);
    setDocuments(bootstrap.documents || []);
  };

  const openRecordFromInvoiceToken = async (token: string, records: ColnaRecord[]) => {
    const normalized = token.trim();
    if (!normalized) return;

    const openRecord = (record: ColnaRecord) => {
      setEditingColnaRecord(record);
      setIsCopyMode(false);
      setIsInvoiceHandoff(true);
      setIsModalOpen(true);
      setActiveTab('COLNA_DATABAZA');
    };

    const fromBootstrap = records.find((record) => record.invoiceToken === normalized);
    if (fromBootstrap) {
      openRecord(fromBootstrap);
      return;
    }

    try {
      const { record } = await appApi.resolveInvoiceToken(normalized);
      openRecord(record);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      // Never surface "not found" / unauthorized as a pre-login dead end.
      // Login gate already ran; only show a soft error if lookup truly failed after auth.
      if (message === 'Unauthorized.' || message === 'Nesprávne heslo') return;
      showToastError(
        message && message !== 'Colný záznam sa nenašiel.'
          ? message
          : 'Colný záznam z odkazu sa nepodarilo otvoriť. Skúste obnoviť stránku po prihlásení.',
      );
    }
  };

  const loadApplicationData = async () => {
    const localAdresy = readLocalJsonArray<AdresaRecord>('mak_adresy_records');
    const localLogin = readLocalJsonArray<LoginRecord>('mak_login_records');
    const localInfoFa = readLocalJsonArray<InfoFaRecord>('mak_info_fa_records');
    const migrateResult = await appApi.migrateBrowserData({
      adresyRecords: localAdresy,
      loginRecords: localLogin,
      infoFaRecords: localInfoFa,
    });
    applyBootstrap(migrateResult.bootstrap);
    clearBrowserBusinessData();
    if (pendingInvoiceToken) {
      await openRecordFromInvoiceToken(pendingInvoiceToken, migrateResult.bootstrap.records);
    }
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // Password is always required except notification invoice links
      // (FAKTURÁCIA NOVEJ COLNICE / FAKTURÁCIA – OPRAVA FAKTÚRY).
      // Existing session cookies must NOT skip the lock on refresh / reopen / new tab.
      if (!pendingInvoiceToken) return;

      try {
        setIsDataLoading(true);
        await appApi.unlockWithInvoiceToken(pendingInvoiceToken);
        await loadApplicationData();
        if (cancelled) return;
        setIsApplicationLocked(false);
        // Remove token from the address bar so a later refresh requires the password.
        const url = new URL(window.location.href);
        if (url.searchParams.has('invoiceToken')) {
          url.searchParams.delete('invoiceToken');
          const next = `${url.pathname}${url.search}${url.hash}`;
          window.history.replaceState({}, '', next);
        }
      } catch {
        // Invalid / expired notification link — stay locked; user must enter password.
      } finally {
        if (!cancelled) setIsDataLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Always keep the text cursor ready in the password field while the app is locked. */
  useEffect(() => {
    if (isApplicationLocked) passwordInputRef.current?.focus();
  }, [isApplicationLocked]);

  // Close month logic
  const handleCloseMonth = async (monthYearToClose: string, closeYear = false) => {
    const { year: targetYear } = parseMonthYear(monthYearToClose);
    const response = await appApi.closeMonth(closeYear);
    applyBootstrap(response.bootstrap);
    const [nextYear, nextMonth] = response.bootstrap.activeMonth.split('-').map(Number);
    const nextMY = formatMonthYear(nextMonth, nextYear);
    setActiveTab('COLNA_DATABAZA');
    showToastSuccess(
      `Mesiac ${monthYearToClose} bol úspešne uzatvorený. Dáta a zisk boli prenesené do REPORTY ${targetYear}. Automaticky bola vytvorená nová čisto prázdna databáza pre mesiac ${nextMY}.`,
      9000,
    );
  };

  const handleToggleReportPaid = async (monthStart: string, isPaid: boolean) => {
    const response = await appApi.toggleReportPaid(monthStart, isPaid);
    applyBootstrap(response.bootstrap);
  };

  /** Reload customs table rows only — keep session, month, filters, and UI state. */
  const handleRefreshCustoms = async () => {
    if (isRefreshingCustoms) return;
    setIsRefreshingCustoms(true);
    try {
      const bootstrap = await appApi.bootstrap();
      setColnaRecords(bootstrap.records);
    } catch (error) {
      setToastMessage(
        error instanceof Error ? error.message : 'Colnú tabuľku sa nepodarilo obnoviť.',
      );
    } finally {
      setIsRefreshingCustoms(false);
    }
  };

  // ZÁKAZNÍK dropdown: ONLY values from Adresár column SKRATKA (never official legal name).
  const customerList = (() => {
    const list: string[] = [];
    const seen = new Set<string>();
    for (const row of adresyRecords) {
      const skratka = String(row.skratka || '').trim();
      if (!skratka || seen.has(skratka)) continue;
      seen.add(skratka);
      list.push(skratka);
    }
    return list;
  })();

  // List of available report years
  const availableYears = Array.from(
    new Set([
      activeReportYear,
      ...monthlyReports.map((report) => report.year),
    ].filter((year) => year > 0))
  ).sort((a, b) => b - a);

  // CRUD for Colna Records
  const handleSaveColnaRecord = async (
    partialRecord: Partial<ColnaRecord> & { invoiceHandoff?: boolean },
    invoiceFile?: File,
    options?: { onUploadComplete?: () => void },
  ) => {
    let savedRecord: ColnaRecord | null = null;
    try {
      const isInvoiceHandoff = Boolean(partialRecord.invoiceHandoff);
      const handoffId = partialRecord.id ? String(partialRecord.id) : '';

      // Accountant handoff: start PDF upload immediately (spinner already running in modal),
      // then save; close only after every step succeeds.
      // onUploadComplete stops the UPLOAD FILE box animation only — blue button keeps spinning.
      if (isInvoiceHandoff && handoffId) {
        if (invoiceFile) {
          const uploadResult = await appApi.uploadInvoice(handoffId, invoiceFile, {
            clearNewBadge: true,
            splatna: partialRecord.splatna,
          });
          savedRecord = uploadResult.record;
          // Keep save payload in sync with auto-calculated due date from upload.
          if (savedRecord.splatna) {
            partialRecord.splatna = savedRecord.splatna;
          }
          options?.onUploadComplete?.();
          applyBootstrap(uploadResult.bootstrap);
        }
        const saveResult = await appApi.saveRecord(partialRecord);
        savedRecord = saveResult.record;
        applyBootstrap(saveResult.bootstrap);
        setIsModalOpen(false);
        setEditingColnaRecord(null);
        setIsCopyMode(false);
        setIsInvoiceHandoff(false);
        return;
      }

      const saveResult = await appApi.saveRecord(partialRecord);
      savedRecord = saveResult.record;
      applyBootstrap(saveResult.bootstrap);
      if (invoiceFile) {
        const uploadResult = await appApi.uploadInvoice(savedRecord.id, invoiceFile, {
          // NEW clears only after accountant upload + successful save.
          clearNewBadge: Boolean(partialRecord.invoiceHandoff),
          // Keep the due date already saved on the record (do not recalculate).
          splatna: savedRecord.splatna || partialRecord.splatna,
        });
        savedRecord = uploadResult.record;
        options?.onUploadComplete?.();
        applyBootstrap(uploadResult.bootstrap);
      }
      // Close dialog after successful save; table already refreshed via bootstrap.
      setIsModalOpen(false);
      setEditingColnaRecord(null);
      setIsCopyMode(false);
      setIsInvoiceHandoff(false);
    } catch (error) {
      if (savedRecord) {
        setEditingColnaRecord(savedRecord);
        setIsModalOpen(true);
      }
      showToastError(error instanceof Error ? error.message : 'Záznam sa nepodarilo uložiť.');
      throw error;
    }
  };

  const handleDownloadInvoiceFromTable = async (recordId: string) => {
    try {
      const { url, fileName } = await appApi.getInvoiceDownloadUrl(recordId);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      showToastError(error instanceof Error ? error.message : 'Faktúru sa nepodarilo stiahnuť.');
    }
  };

  const handleDeleteColnaRecords = async (ids: string[]) => {
    try {
      const { bootstrap } = await appApi.deleteRecords(ids);
      applyBootstrap(bootstrap);
    } catch (error) {
      showToastError(error instanceof Error ? error.message : 'Záznamy sa nepodarilo vymazať.');
    }
  };

  const handleDeleteInvoice = async (recordId: string) => {
    try {
      const { record, bootstrap } = await appApi.deleteInvoice(recordId);
      applyBootstrap(bootstrap);
      setEditingColnaRecord(record);
    } catch (error) {
      showToastError(error instanceof Error ? error.message : 'Faktúru sa nepodarilo vymazať.');
      throw error;
    }
  };

  const handleTogglePaid = async (id: string, zaplatena: boolean) => {
    try {
      const { bootstrap } = await appApi.togglePaid(id, zaplatena);
      applyBootstrap(bootstrap);
    } catch (error) {
      showToastError(error instanceof Error ? error.message : 'Stav úhrady sa nepodarilo uložiť.');
    }
  };

  // CRUD for Adresy
  const handleSaveAdresaRecord = async (record: AdresaRecord) => {
    try {
      const { bootstrap } = await appApi.saveAdresaRecord(record);
      applyBootstrap(bootstrap);
    } catch (error) {
      showToastError(error instanceof Error ? error.message : 'Adresu sa nepodarilo uložiť.');
    }
  };

  const handleDeleteAdresaRecord = async (id: string) => {
    try {
      const { bootstrap } = await appApi.deleteAdresaRecord(id);
      applyBootstrap(bootstrap);
    } catch (error) {
      showToastError(error instanceof Error ? error.message : 'Adresu sa nepodarilo vymazať.');
    }
  };

  // CRUD for Login Records
  const handleSaveLoginRecord = async (record: LoginRecord) => {
    try {
      const { bootstrap } = await appApi.saveLoginRecord(record);
      applyBootstrap(bootstrap);
    } catch (error) {
      showToastError(error instanceof Error ? error.message : 'Prihlasovacie údaje sa nepodarilo uložiť.');
    }
  };

  const handleDeleteLoginRecord = async (id: string) => {
    try {
      const { bootstrap } = await appApi.deleteLoginRecord(id);
      applyBootstrap(bootstrap);
    } catch (error) {
      showToastError(error instanceof Error ? error.message : 'Prihlasovacie údaje sa nepodarilo vymazať.');
    }
  };

  const handleReorderLoginRecords = async (loginOrder: { I: string[]; II: string[] }) => {
    try {
      const { bootstrap } = await appApi.reorderLoginRecords(loginOrder);
      applyBootstrap(bootstrap);
    } catch (error) {
      showToastError(
        error instanceof Error ? error.message : 'Poradie prihlasovacích údajov sa nepodarilo uložiť.',
      );
      throw error;
    }
  };

  // CRUD for Info FA
  const handleSaveInfoFaRecord = async (record: InfoFaRecord) => {
    try {
      const { bootstrap } = await appApi.saveInfoFaRecord(record);
      applyBootstrap(bootstrap);
    } catch (error) {
      showToastError(error instanceof Error ? error.message : 'Info FA sa nepodarilo uložiť.');
    }
  };

  const handleDeleteInfoFaRecord = async (id: string) => {
    try {
      const { bootstrap } = await appApi.deleteInfoFaRecord(id);
      applyBootstrap(bootstrap);
    } catch (error) {
      showToastError(error instanceof Error ? error.message : 'Info FA sa nepodarilo vymazať.');
    }
  };

  const handleSaveCennikRecord = async (record: CennikRecord) => {
    try {
      const { bootstrap } = await appApi.saveCennikRecord(record);
      applyBootstrap(bootstrap);
    } catch (error) {
      showToastError(error instanceof Error ? error.message : 'Cenník sa nepodarilo uložiť.');
    }
  };

  const handleDeleteCennikRecord = async (id: string) => {
    try {
      const { bootstrap } = await appApi.deleteCennikRecord(id);
      applyBootstrap(bootstrap);
    } catch (error) {
      showToastError(error instanceof Error ? error.message : 'Položku cenníka sa nepodarilo vymazať.');
    }
  };

  const handleUploadDocument = async (file: File, note: string) => {
    const { bootstrap } = await appApi.uploadDocument(file, note);
    applyBootstrap(bootstrap);
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      const { bootstrap } = await appApi.deleteDocument(id);
      applyBootstrap(bootstrap);
    } catch (error) {
      showToastError(error instanceof Error ? error.message : 'Súbor sa nepodarilo vymazať.');
    }
  };

  const handleDownloadDocument = async (id: string) => {
    try {
      const { url } = await appApi.getDocumentDownloadUrl(id);
      const link = document.createElement('a');
      link.href = url;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      showToastError(error instanceof Error ? error.message : 'Súbor sa nepodarilo stiahnuť.');
    }
  };

  const handleApplicationUnlock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsDataLoading(true);
    setApplicationError('');
    try {
      await appApi.unlock(applicationPassword);
      await loadApplicationData();
      setIsApplicationLocked(false);
      setApplicationPassword('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Aplikáciu sa nepodarilo načítať.';
      if (message === 'Nesprávne heslo') {
        setPasswordError(true);
      } else {
        setApplicationError(message);
      }
    } finally {
      setIsDataLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Header and Quick Stats Block connected together */}
      <div className="sticky top-0 z-40 bg-[#000a2f] print:hidden">
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          availableYears={availableYears}
          activeReportYear={activeReportYear}
        />

        {/* Quick Stats Banner matching Screenshot */}
        <QuickStatsHeader
          currentMonthYear={currentMonthYear}
          onMonthYearChange={setCurrentMonthYear}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          records={colnaRecords}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onRefreshCustoms={handleRefreshCustoms}
          isRefreshingCustoms={isRefreshingCustoms}
          showMonthYearBanner={activeTab === 'COLNA_DATABAZA'}
        />
      </div>

      {/* Success Banner (green) */}
      {toastMessage && !toastError && (
        <div className="bg-emerald-600 text-white px-4 py-3 border-b border-emerald-500 shadow-md flex items-center justify-between font-medium text-xs animate-in slide-in-from-top duration-200 print:hidden">
          <div className="flex items-center gap-2.5">
            <img src="/yes.png" alt="" className="max-w-none object-contain shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => {
              if (toastDismissTimerRef.current) clearTimeout(toastDismissTimerRef.current);
              setToastMessage(null);
            }}
            className="text-emerald-100 hover:text-white text-base font-bold px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Banner (red) */}
      {toastError && (
        <div className="bg-red-600 text-white px-4 py-3 border-b border-red-500 shadow-md flex items-center justify-between font-medium text-xs animate-in slide-in-from-top duration-200 print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="shrink-0 w-5 h-5 inline-flex items-center justify-center text-white text-lg leading-none" aria-hidden="true">✕</span>
            <span>{toastError}</span>
          </div>
          <button
            onClick={() => {
              if (toastDismissTimerRef.current) clearTimeout(toastDismissTimerRef.current);
              setToastError(null);
            }}
            className="text-red-100 hover:text-white text-base font-bold px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Workspace */}
      <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 py-1.5 overflow-x-hidden print:p-0 print:overflow-visible" style={{ backgroundColor: '#000a2f' }}>
        {activeTab === 'COLNA_DATABAZA' && (
          <ColnaDatagrid
            records={colnaRecords}
            customerDirectory={adresyRecords}
            onAddRecord={() => {
              setEditingColnaRecord(null);
              setIsCopyMode(false);
              setIsInvoiceHandoff(false);
              setIsModalOpen(true);
            }}
            onEditRecord={(r) => {
              setEditingColnaRecord(r);
              setIsCopyMode(false);
              setIsInvoiceHandoff(false);
              setIsModalOpen(true);
            }}
            onCopyRecord={(r) => {
              setEditingColnaRecord(r);
              setIsCopyMode(true);
              setIsInvoiceHandoff(false);
              setIsModalOpen(true);
            }}
            onDeleteRecords={handleDeleteColnaRecords}
            onTogglePaid={handleTogglePaid}
            onDownloadInvoice={handleDownloadInvoiceFromTable}
            onSaveRecord={handleSaveColnaRecord}
            onCustomerInvoiceEmailSent={(record) => {
              setColnaRecords((prev) =>
                prev.map((r) => (r.id === record.id ? { ...r, ...record } : r)),
              );
              setActiveTab('COLNA_DATABAZA');
            }}
            searchTerm={searchTerm}
            currentMonthYear={currentMonthYear}
            onCloseMonth={handleCloseMonth}
            onMonthYearChange={setCurrentMonthYear}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />
        )}

        {activeTab === 'ADRESY' && (
          <AdresyView
            records={adresyRecords}
            searchTerm={searchTerm}
            onSaveRecord={handleSaveAdresaRecord}
            onDeleteRecord={handleDeleteAdresaRecord}
          />
        )}

        {activeTab === 'LOGIN_UDAJE' && (
          <LoginUdajeView
            records={loginRecords}
            searchTerm={searchTerm}
            onSaveRecord={handleSaveLoginRecord}
            onDeleteRecord={handleDeleteLoginRecord}
            onReorderRecords={handleReorderLoginRecords}
          />
        )}

        {activeTab === 'INFO_FA' && (
          <InfoFaView
            records={infoFaRecords}
            onSaveRecord={handleSaveInfoFaRecord}
            onDeleteRecord={handleDeleteInfoFaRecord}
          />
        )}

        {activeTab === 'CENNIK' && (
          <CennikView
            records={cennikRecords}
            onSaveRecord={handleSaveCennikRecord}
            onDeleteRecord={handleDeleteCennikRecord}
          />
        )}

        {activeTab.startsWith('REPORTY_') && (
          <ReportyView
            records={colnaRecords}
            reports={monthlyReports}
            year={parseInt(activeTab.replace('REPORTY_', ''), 10) || activeReportYear}
            onYearChange={(y) => setActiveTab(`REPORTY_${y}`)}
            availableYears={availableYears}
            searchTerm={searchTerm}
            customerDirectory={adresyRecords}
            onTogglePaid={handleToggleReportPaid}
          />
        )}

        {activeTab === 'SUBORY' && (
          <SuboryView
            files={documents}
            onUpload={handleUploadDocument}
            onDelete={handleDeleteDocument}
            onDownload={handleDownloadDocument}
          />
        )}

        {activeTab === 'COLNICA_GB_VAT_EORI' && (
          <ColnicaEmptyView title="GB VAT/EORI CHECKER" />
        )}
        {activeTab === 'COLNICA_EU_VAT_EORI' && (
          <ColnicaEmptyView title="EU VAT/EORI CHECKER" />
        )}
        {activeTab === 'COLNICA_GB_TARIFF' && (
          <ColnicaEmptyView title="GB ONLINE TARIFF" />
        )}
        {activeTab === 'COLNICA_EU_TARIFF' && (
          <ColnicaEmptyView title="EU ONLINE TARIFF" />
        )}
        {activeTab === 'COLNICA_REX' && (
          <ColnicaEmptyView title="REX CHECKER" />
        )}
      </main>

      {/* Add / Edit Record Modal */}
      <RecordModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingColnaRecord(null);
          setIsCopyMode(false);
          setIsInvoiceHandoff(false);
        }}
        onSave={handleSaveColnaRecord}
        onDeleteInvoice={handleDeleteInvoice}
        initialRecord={editingColnaRecord}
        customerList={customerList}
        customerDirectory={adresyRecords}
        copyMode={isCopyMode}
        invoiceHandoffMode={isInvoiceHandoff}
        defaultDate={(() => {
          // Match header "Dátum" (local calendar today) — never first-of-month / UTC yesterday.
          const today = new Date();
          const y = today.getFullYear();
          const m = String(today.getMonth() + 1).padStart(2, '0');
          const d = String(today.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        })()}
      />

      {/* Bottom Footer */}
      <footer className="border-t border-slate-900 bg-[#060a12] py-4 text-center text-xs text-slate-500 print:hidden">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-center">
          <div>
            © 2026 <strong className="text-slate-300 ml-3">MAK DISTRIBUTION</strong>
          </div>
        </div>
      </footer>

      {isApplicationLocked && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/20 backdrop-blur-md print:hidden">
          <div className="w-[90vw] h-[90vh] flex items-center justify-center rounded-2xl border border-white/60 bg-white/80 shadow-2xl backdrop-blur-xl">
            <form onSubmit={handleApplicationUnlock} className="w-full max-w-sm px-8 text-center">
              <p className="mb-3 text-center text-4xl font-bold uppercase tracking-wide text-slate-900">
                ZADAJTE  HESLO
              </p>
              <input
                type="password"
                ref={passwordInputRef}
                value={applicationPassword}
                onChange={(event) => {
                  setApplicationPassword(event.target.value);
                  setPasswordError(false);
                  setApplicationError('');
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-600"
                autoFocus
              />
              {passwordError && (
                <p className="mt-3 text-sm font-semibold text-red-600">Nesprávne heslo</p>
              )}
              {applicationError && (
                <p className="mt-3 text-sm font-semibold text-red-600">{applicationError}</p>
              )}
              <button
                type="submit"
                disabled={isDataLoading}
                className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
              >
                {isDataLoading ? 'Načítavam…' : 'Vstúpiť'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
