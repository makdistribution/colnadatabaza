import React, { useState, useEffect } from 'react';
import { 
  ColnaRecord, 
  AppBootstrap,
  MonthlyReport,
  AdresaRecord, 
  LoginRecord, 
  InfoFaRecord, 
  ActiveTab 
} from './types';
import { parseMonthYear, formatMonthYear } from './utils/monthUtils';
import { 
  INITIAL_ADRESY_RECORDS, 
  INITIAL_LOGIN_RECORDS, 
  INITIAL_INFO_FA_RECORDS 
} from './data/initialData';
import { Header } from './components/Header';
import { QuickStatsHeader } from './components/QuickStatsHeader';
import { ColnaDatagrid } from './components/ColnaDatagrid';
import { RecordModal } from './components/RecordModal';
import { AdresyView } from './components/AdresyView';
import { LoginUdajeView } from './components/LoginUdajeView';
import { InfoFaView } from './components/InfoFaView';
import { ReportyView } from './components/ReportyView';
import { SuboryView } from './components/SuboryView';
import { InvoiceCaseView } from './components/InvoiceCaseView';
import { appApi } from './lib/appApi';

export default function App() {
  const invoiceToken = new URLSearchParams(window.location.search).get('invoiceToken');
  const [colnaRecords, setColnaRecords] = useState<ColnaRecord[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [activeReportYear, setActiveReportYear] = useState(0);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const [adresyRecords, setAdresyRecords] = useState<AdresaRecord[]>(() => {
    const saved = localStorage.getItem('mak_adresy_records');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_ADRESY_RECORDS;
  });

  const [loginRecords, setLoginRecords] = useState<LoginRecord[]>(() => {
    const saved = localStorage.getItem('mak_login_records');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_LOGIN_RECORDS;
  });

  const [infoFaRecords, setInfoFaRecords] = useState<InfoFaRecord[]>(() => {
    const saved = localStorage.getItem('mak_info_fa_records');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_INFO_FA_RECORDS;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('COLNA_DATABAZA');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMonthYear, setCurrentMonthYear] = useState('');
  const [statusFilter, setStatusFilter] = useState<'OFF' | 'ALL' | 'UNPAID' | 'NEW'>('OFF');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isApplicationLocked, setIsApplicationLocked] = useState(true);
  const [applicationPassword, setApplicationPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [applicationError, setApplicationError] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingColnaRecord, setEditingColnaRecord] = useState<ColnaRecord | null>(null);
  const [isCopyMode, setIsCopyMode] = useState(false);

  const applyBootstrap = (bootstrap: AppBootstrap) => {
    const [year, month] = bootstrap.activeMonth.split('-').map(Number);
    setCurrentMonthYear(formatMonthYear(month, year));
    setActiveReportYear(bootstrap.activeReportYear);
    setColnaRecords(bootstrap.records);
    setMonthlyReports(bootstrap.reports);
  };

  // Close month logic
  const handleCloseMonth = async (monthYearToClose: string, closeYear = false) => {
    const { year: targetYear } = parseMonthYear(monthYearToClose);
    const response = await appApi.closeMonth(closeYear);
    applyBootstrap(response.bootstrap);
    const [nextYear, nextMonth] = response.bootstrap.activeMonth.split('-').map(Number);
    const nextMY = formatMonthYear(nextMonth, nextYear);
    setActiveTab('COLNA_DATABAZA');
    setToastMessage(`Mesiac ${monthYearToClose} bol úspešne uzatvorený. Dáta a zisk boli prenesené do REPORTY ${targetYear}. Automaticky bola vytvorená nová čisto prázdna databáza pre mesiac ${nextMY}.`);
    setTimeout(() => setToastMessage(null), 9000);
  };

  useEffect(() => {
    localStorage.setItem('mak_adresy_records', JSON.stringify(adresyRecords));
  }, [adresyRecords]);

  useEffect(() => {
    localStorage.setItem('mak_login_records', JSON.stringify(loginRecords));
  }, [loginRecords]);

  useEffect(() => {
    localStorage.setItem('mak_info_fa_records', JSON.stringify(infoFaRecords));
  }, [infoFaRecords]);

  // List of unique customer names for dropdowns (ensuring no duplicate variations)
  const customerList = (() => {
    const defaultCustomers = [
      'Petertransporte',
      'CSAD Tisnov',
      'edysea',
      'STANFUD',
      'MJ Sped',
      'Martin Andel',
      'ABC SPED'
    ];

    const colnaCustomers = colnaRecords.map((c) => c.zakaznik?.trim()).filter(Boolean);
    const adresyCustomers = adresyRecords.map((a) => a.nazovFirmy?.trim()).filter(Boolean);

    const cleanNormalize = (str: string) =>
      str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\s.,_\-]/g, '')
        .replace(/sro|spolsro/g, '');

    const list: string[] = [];
    const seenKeys = new Set<string>();

    const addCustomer = (name: string) => {
      if (!name) return;
      const trimmed = name.trim();
      const key = cleanNormalize(trimmed);
      if (!key) return;

      let alreadyExists = false;
      for (const seen of seenKeys) {
        if (
          seen === key ||
          (seen.length >= 4 && key.length >= 4 && (seen.includes(key) || key.includes(seen)))
        ) {
          alreadyExists = true;
          break;
        }
      }
      if (!alreadyExists) {
        seenKeys.add(key);
        list.push(trimmed);
      }
    };

    defaultCustomers.forEach(addCustomer);
    colnaCustomers.forEach(addCustomer);
    adresyCustomers.forEach(addCustomer);

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
    partialRecord: Partial<ColnaRecord>,
    invoiceFile?: File,
  ) => {
    let savedRecord: ColnaRecord | null = null;
    try {
      const saveResult = await appApi.saveRecord(partialRecord);
      savedRecord = saveResult.record;
      applyBootstrap(saveResult.bootstrap);
      if (invoiceFile) {
        setEditingColnaRecord(savedRecord);
        const uploadResult = await appApi.uploadInvoice(savedRecord.id, invoiceFile);
        savedRecord = uploadResult.record;
        applyBootstrap(uploadResult.bootstrap);
      }
      setIsModalOpen(false);
      setEditingColnaRecord(null);
      setIsCopyMode(false);
    } catch (error) {
      if (savedRecord) setEditingColnaRecord(savedRecord);
      setToastMessage(error instanceof Error ? error.message : 'Záznam sa nepodarilo uložiť.');
    }
  };

  const handleDeleteColnaRecords = async (ids: string[]) => {
    try {
      const { bootstrap } = await appApi.deleteRecords(ids);
      applyBootstrap(bootstrap);
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : 'Záznamy sa nepodarilo vymazať.');
    }
  };

  const handleTogglePaid = async (id: string, zaplatena: boolean) => {
    try {
      const { bootstrap } = await appApi.togglePaid(id, zaplatena);
      applyBootstrap(bootstrap);
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : 'Stav úhrady sa nepodarilo uložiť.');
    }
  };

  // CRUD for Adresy
  const handleSaveAdresaRecord = (record: AdresaRecord) => {
    setAdresyRecords((prev) => {
      const exists = prev.some((a) => a.id === record.id);
      if (exists) {
        return prev.map((a) => (a.id === record.id ? record : a));
      }
      return [record, ...prev];
    });
  };

  const handleDeleteAdresaRecord = (id: string) => {
    setAdresyRecords((prev) => prev.filter((a) => a.id !== id));
  };

  // CRUD for Login Records
  const handleSaveLoginRecord = (record: LoginRecord) => {
    setLoginRecords((prev) => {
      const exists = prev.some((l) => l.id === record.id);
      if (exists) {
        return prev.map((l) => (l.id === record.id ? record : l));
      }
      return [record, ...prev];
    });
  };

  const handleDeleteLoginRecord = (id: string) => {
    setLoginRecords((prev) => prev.filter((l) => l.id !== id));
  };

  // CRUD for Info FA
  const handleSaveInfoFaRecord = (record: InfoFaRecord) => {
    setInfoFaRecords((prev) => {
      const exists = prev.some((i) => i.id === record.id);
      if (exists) {
        return prev.map((i) => (i.id === record.id ? record : i));
      }
      return [record, ...prev];
    });
  };

  const handleDeleteInfoFaRecord = (id: string) => {
    setInfoFaRecords((prev) => prev.filter((i) => i.id !== id));
  };

  // Calculate current month profit & unpaid count
  const unpaidCount = colnaRecords.filter((r) => !r.zaplatena).length;
  const currentMonthProfit = colnaRecords.reduce((acc, r) => acc + (r.zisk || 0), 0);

  const handleApplicationUnlock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsDataLoading(true);
    setApplicationError('');
    try {
      await appApi.unlock(applicationPassword);
      const bootstrap = await appApi.bootstrap();
      applyBootstrap(bootstrap);
      setIsApplicationLocked(false);
      setApplicationPassword('');
      localStorage.removeItem('mak_colna_records');
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

  if (invoiceToken) {
    return <InvoiceCaseView token={invoiceToken} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Header and Quick Stats Block connected together */}
      <div className="sticky top-0 z-40 bg-[#000a2f]">
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
        />
      </div>

      {/* Success / Notification Banner */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white px-4 py-3 border-b border-emerald-500 shadow-md flex items-center justify-between font-medium text-xs animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2.5">
            <span className="bg-emerald-700 p-1 rounded-md">✓</span>
            <span>{toastMessage}</span>
          </div>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-emerald-100 hover:text-white text-base font-bold px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Workspace */}
      <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 py-2 overflow-x-hidden" style={{ backgroundColor: '#000a2f' }}>
        {activeTab === 'COLNA_DATABAZA' && (
          <ColnaDatagrid
            records={colnaRecords}
            onAddRecord={() => {
              setEditingColnaRecord(null);
              setIsCopyMode(false);
              setIsModalOpen(true);
            }}
            onEditRecord={(r) => {
              setEditingColnaRecord(r);
              setIsCopyMode(false);
              setIsModalOpen(true);
            }}
            onCopyRecord={(r) => {
              setEditingColnaRecord(r);
              setIsCopyMode(true);
              setIsModalOpen(true);
            }}
            onDeleteRecords={handleDeleteColnaRecords}
            onTogglePaid={handleTogglePaid}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
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
            onSaveRecord={handleSaveAdresaRecord}
            onDeleteRecord={handleDeleteAdresaRecord}
          />
        )}

        {activeTab === 'LOGIN_UDAJE' && (
          <LoginUdajeView
            records={loginRecords}
            onSaveRecord={handleSaveLoginRecord}
            onDeleteRecord={handleDeleteLoginRecord}
          />
        )}

        {activeTab === 'INFO_FA' && (
          <InfoFaView
            records={infoFaRecords}
            onSaveRecord={handleSaveInfoFaRecord}
            onDeleteRecord={handleDeleteInfoFaRecord}
          />
        )}

        {activeTab.startsWith('REPORTY_') && (
          <ReportyView
            records={colnaRecords}
            reports={monthlyReports}
            year={parseInt(activeTab.replace('REPORTY_', ''), 10) || activeReportYear}
            onYearChange={(y) => setActiveTab(`REPORTY_${y}`)}
            availableYears={availableYears}
          />
        )}

        {activeTab === 'SUBORY' && <SuboryView />}
      </main>

      {/* Add / Edit Record Modal */}
      <RecordModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingColnaRecord(null);
          setIsCopyMode(false);
        }}
        onSave={handleSaveColnaRecord}
        initialRecord={editingColnaRecord}
        customerList={customerList}
        copyMode={isCopyMode}
        defaultDate={`${parseMonthYear(currentMonthYear).year}-${String(parseMonthYear(currentMonthYear).month).padStart(2, '0')}-01`}
      />

      {/* Bottom Footer */}
      <footer className="border-t border-slate-900 bg-[#060a12] py-4 text-center text-xs text-slate-500">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-center">
          <div>
            © 2026 <strong className="text-slate-300 ml-3">MAK DISTRIBUTION</strong>
          </div>
        </div>
      </footer>

      {isApplicationLocked && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/20 backdrop-blur-md">
          <div className="w-[90vw] h-[90vh] flex items-center justify-center rounded-2xl border border-white/60 bg-white/80 shadow-2xl backdrop-blur-xl">
            <form onSubmit={handleApplicationUnlock} className="w-full max-w-sm px-8 text-center">
              <h1 className="mb-6 text-2xl font-bold text-slate-900">Prístup do aplikácie</h1>
              <input
                type="password"
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
