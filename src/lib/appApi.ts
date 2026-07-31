import type { AppBootstrap, ColnaRecord } from '../types';

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
