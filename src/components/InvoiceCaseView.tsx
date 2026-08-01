import React, { useEffect, useState } from 'react';
import type { ColnaRecord } from '../types';
import { RecordModal } from './RecordModal';

interface InvoiceCaseViewProps {
  token: string;
}

export const InvoiceCaseView: React.FC<InvoiceCaseViewProps> = ({ token }) => {
  const [record, setRecord] = useState<ColnaRecord | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/invoice?token=${encodeURIComponent(token)}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        const body = (await response.json()) as { record?: ColnaRecord; error?: string };
        if (!response.ok || !body.record) {
          throw new Error(body.error || 'Colný záznam sa nepodarilo načítať.');
        }
        setRecord(body.record);
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

  return (
    <RecordModal
      isOpen
      onClose={closeWindow}
      onSave={() => {}}
      initialRecord={record}
      customerList={[record.zakaznik]}
      readOnly
    />
  );
};
