import React, { useEffect, useState } from 'react';
import type { AdresaRecord, ColnaRecord } from '../types';
import { RecordModal } from './RecordModal';
import { appApi } from '../lib/appApi';

interface InvoiceCaseViewProps {
  token: string;
}

export const InvoiceCaseView: React.FC<InvoiceCaseViewProps> = ({ token }) => {
  const [record, setRecord] = useState<ColnaRecord | null>(null);
  const [adresyRecords, setAdresyRecords] = useState<AdresaRecord[]>([]);
  const [error, setError] = useState('');
  const [savingToast, setSavingToast] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/invoice?token=${encodeURIComponent(token)}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        const body = (await response.json()) as {
          record?: ColnaRecord;
          adresyRecords?: AdresaRecord[];
          error?: string;
        };
        if (!response.ok || !body.record) {
          throw new Error(body.error || 'Colný záznam sa nepodarilo načítať.');
        }
        setRecord(body.record);
        setAdresyRecords(body.adresyRecords || []);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Colný záznam sa nepodarilo načítať.',
        );
      });
    return () => controller.abort();
  }, [token]);

  if (!record) {
    return (
      <div className="min-h-screen bg-[#000a2f] flex items-center justify-center px-4 text-center">
        <div className="rounded-xl border border-slate-200 bg-white px-8 py-6 text-sm font-semibold text-slate-700 shadow-2xl">
          {error || 'Načítavam colný záznam…'}
        </div>
      </div>
    );
  }

  const closeWindow = () => {
    window.close();
    window.setTimeout(() => {
      if (!window.closed) window.location.assign('/');
    }, 100);
  };

  const handleSave = async (
    payload: Partial<ColnaRecord>,
    invoiceFile?: File,
    options?: { onUploadComplete?: () => void },
  ) => {
    try {
      if (!record.id) return;
      const merged: Partial<ColnaRecord> & { invoiceHandoff?: boolean } = {
        ...payload,
        id: record.id,
        invoiceHandoff: true,
      };
      const { record: saved } = await appApi.saveRecord(merged);
      if (invoiceFile) {
        try {
          await appApi.uploadInvoice(saved.id!, invoiceFile, {
            splatna: payload.splatna || undefined,
          });
        } finally {
          options?.onUploadComplete?.();
        }
      }
      setRecord(saved);
      setSavingToast('Záznam bol úspešne uložený a odoslaný.');
      window.setTimeout(() => {
        setSavingToast(null);
        closeWindow();
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Uloženie zlyhalo.';
      setError(msg);
      setSavingToast(null);
      throw err;
    }
  };

  const handleDeleteInvoice = async (recordId: string) => {
    await appApi.deleteInvoice(recordId);
    setRecord((prev) =>
      prev ? { ...prev, invoicePdfPath: undefined, cisloFa: '', splatna: '' } : prev,
    );
  };

  const customerList = adresyRecords.length > 0
    ? adresyRecords.map((r) => r.skratka).filter(Boolean)
    : [record.zakaznik];

  return (
    <>
      {savingToast && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center pt-24 pointer-events-none print:hidden">
          <div className="pointer-events-none rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-2xl">
            {savingToast}
          </div>
        </div>
      )}
      <RecordModal
        isOpen
        onClose={closeWindow}
        onSave={handleSave}
        onDeleteInvoice={handleDeleteInvoice}
        initialRecord={record}
        customerList={customerList}
        customerDirectory={adresyRecords}
        invoiceHandoffMode
      />
    </>
  );
};
