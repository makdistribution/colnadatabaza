import type { AppBootstrap, ColnaRecord } from '../types';
import { supabase } from './supabase';

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
  bootstrap: () => request<AppBootstrap>('/api/app'),
  saveRecord: (record: Partial<ColnaRecord>) =>
    request<{ record: ColnaRecord; bootstrap: AppBootstrap }>('/api/app', {
      method: 'POST',
      body: JSON.stringify({ action: 'saveRecord', record }),
    }),
  uploadInvoice: async (recordId: string, file: File) => {
    if (!(file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
      throw new Error('Nahrať je možné iba PDF súbor.');
    }
    if (file.size > 20 * 1024 * 1024) {
      throw new Error('PDF súbor môže mať maximálne 20 MB.');
    }

    const prepared = await request<{ invoicePath: string; token: string }>('/api/app', {
      method: 'POST',
      body: JSON.stringify({ action: 'prepareInvoiceUpload', id: recordId }),
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
      }),
    });
  },
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
};
