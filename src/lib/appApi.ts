import type {
  AdresaRecord,
  AppBootstrap,
  AppDocument,
  ColnaRecord,
  InfoFaRecord,
  LoginRecord,
} from '../types';
import { supabase } from './supabase';
import { calculateInvoiceDueDate } from '../utils/dueDate';
import { sanitizeAppDocumentFileName } from '../utils/appDocumentFile';

const request = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(body.error || 'Server request failed.');
  return body as T;
};

export const appApi = {
  getSession: () => request<{ authenticated: boolean }>('/api/session'),
  unlock: (password: string) =>
    request<{ authenticated: boolean }>('/api/session', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
  /** Skip password only for valid FAKTURÁCIA notification links (?invoiceToken=). */
  unlockWithInvoiceToken: (invoiceToken: string) =>
    request<{ authenticated: boolean }>('/api/session', {
      method: 'POST',
      body: JSON.stringify({ invoiceToken }),
    }),
  bootstrap: () => request<AppBootstrap>('/api/app'),
  migrateBrowserData: (payload: {
    adresyRecords?: AdresaRecord[];
    loginRecords?: LoginRecord[];
    infoFaRecords?: InfoFaRecord[];
  }) =>
    request<{ bootstrap: AppBootstrap }>('/api/app', {
      method: 'POST',
      body: JSON.stringify({ action: 'migrateBrowserData', ...payload }),
    }),
  saveRecord: (record: Partial<ColnaRecord> & { invoiceHandoff?: boolean }) =>
    request<{ record: ColnaRecord; bootstrap: AppBootstrap }>('/api/app', {
      method: 'POST',
      body: JSON.stringify({ action: 'saveRecord', record }),
    }),
  uploadInvoice: async (
    recordId: string,
    file: File,
    options?: { clearNewBadge?: boolean },
  ) => {
    if (!(file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
      throw new Error('Nahrať je možné iba PDF súbor.');
    }
    if (file.size > 20 * 1024 * 1024) {
      throw new Error('PDF súbor môže mať maximálne 20 MB.');
    }

    const prepared = await request<{ invoicePath: string; token: string }>('/api/app', {
      method: 'POST',
      body: JSON.stringify({
        action: 'prepareInvoiceUpload',
        id: recordId,
        fileName: file.name,
      }),
    });
    const { error } = await supabase.storage
      .from('invoice-pdfs')
      .uploadToSignedUrl(prepared.invoicePath, prepared.token, file, {
        contentType: 'application/pdf',
        upsert: true,
      });
    if (error) throw new Error(error.message);

    return request<{ record: ColnaRecord; bootstrap: AppBootstrap }>('/api/app', {
      method: 'POST',
      body: JSON.stringify({
        action: 'completeInvoiceUpload',
        id: recordId,
        invoicePath: prepared.invoicePath,
        splatna: calculateInvoiceDueDate(),
        clearNewBadge: Boolean(options?.clearNewBadge),
      }),
    });
  },
  deleteInvoice: (recordId: string) =>
    request<{ record: ColnaRecord; bootstrap: AppBootstrap }>('/api/app', {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteInvoice', id: recordId }),
    }),
  getInvoiceDownloadUrl: (recordId: string) =>
    request<{ url: string; fileName: string }>('/api/app', {
      method: 'POST',
      body: JSON.stringify({ action: 'getInvoiceDownloadUrl', id: recordId }),
    }),
  resolveInvoiceToken: (token: string) =>
    request<{ record: ColnaRecord }>(`/api/invoice?token=${encodeURIComponent(token)}`),
  deleteRecords: (ids: string[]) =>
    request<{ success: true; bootstrap: AppBootstrap }>('/api/app', {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteRecords', ids }),
    }),
  togglePaid: (id: string, zaplatena: boolean) =>
    request<{ record: ColnaRecord; bootstrap: AppBootstrap }>('/api/app', {
      method: 'POST',
      body: JSON.stringify({ action: 'togglePaid', id, zaplatena }),
    }),
  closeMonth: (closeYear: boolean) =>
    request<{ bootstrap: AppBootstrap }>('/api/app', {
      method: 'POST',
      body: JSON.stringify({ action: 'closeMonth', closeYear }),
    }),
  resetData: () =>
    request<{ bootstrap: AppBootstrap }>('/api/app', {
      method: 'POST',
      body: JSON.stringify({ action: 'resetData' }),
    }),
  saveAdresaRecord: (adresaRecord: AdresaRecord) =>
    request<{ record: AdresaRecord; bootstrap: AppBootstrap }>('/api/app', {
      method: 'POST',
      body: JSON.stringify({ action: 'saveAdresaRecord', adresaRecord }),
    }),
  deleteAdresaRecord: (id: string) =>
    request<{ success: true; bootstrap: AppBootstrap }>('/api/app', {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteAdresaRecord', id }),
    }),
  saveLoginRecord: (loginRecord: LoginRecord) =>
    request<{ bootstrap: AppBootstrap }>('/api/app', {
      method: 'POST',
      body: JSON.stringify({ action: 'saveLoginRecord', loginRecord }),
    }),
  deleteLoginRecord: (id: string) =>
    request<{ success: true; bootstrap: AppBootstrap }>('/api/app', {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteLoginRecord', id }),
    }),
  reorderLoginRecords: (loginOrder: { I: string[]; II: string[] }) =>
    request<{ bootstrap: AppBootstrap }>('/api/app', {
      method: 'POST',
      body: JSON.stringify({ action: 'reorderLoginRecords', loginOrder }),
    }),
  saveInfoFaRecord: (infoFaRecord: InfoFaRecord) =>
    request<{ bootstrap: AppBootstrap }>('/api/app', {
      method: 'POST',
      body: JSON.stringify({ action: 'saveInfoFaRecord', infoFaRecord }),
    }),
  deleteInfoFaRecord: (id: string) =>
    request<{ success: true; bootstrap: AppBootstrap }>('/api/app', {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteInfoFaRecord', id }),
    }),
  uploadDocument: async (file: File, note: string) => {
    if (file.size <= 0 || file.size > 50 * 1024 * 1024) {
      throw new Error('Súbor môže mať maximálne 50 MB.');
    }
    const fileName = sanitizeAppDocumentFileName(file.name);
    const prepared = await request<{ id: string; storagePath: string; token: string }>(
      '/api/app',
      {
        method: 'POST',
        body: JSON.stringify({
          action: 'prepareDocumentUpload',
          fileName,
        }),
      },
    );
    const { error } = await supabase.storage
      .from('app-documents')
      .uploadToSignedUrl(prepared.storagePath, prepared.token, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });
    if (error) throw new Error(error.message);

    return request<{ document: AppDocument; bootstrap: AppBootstrap }>('/api/app', {
      method: 'POST',
      body: JSON.stringify({
        action: 'completeDocumentUpload',
        id: prepared.id,
        storagePath: prepared.storagePath,
        fileName,
        note,
        sizeBytes: file.size,
      }),
    });
  },
  deleteDocument: (id: string) =>
    request<{ success: true; bootstrap: AppBootstrap }>('/api/app', {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteDocument', id }),
    }),
  getDocumentDownloadUrl: (id: string) =>
    request<{ url: string; fileName: string }>('/api/app', {
      method: 'POST',
      body: JSON.stringify({ action: 'getDocumentDownloadUrl', id }),
    }),
};
