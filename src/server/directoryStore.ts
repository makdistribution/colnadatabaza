import type { SupabaseClient } from '@supabase/supabase-js';
import type { AdresaRecord, AppDocument, InfoFaRecord, LoginRecord } from '../types.js';
import {
  INITIAL_ADRESY_RECORDS,
  INITIAL_INFO_FA_RECORDS,
  INITIAL_LOGIN_RECORDS,
} from '../data/initialData.js';
import {
  formatDocumentDate,
  formatDocumentSizeLabel,
} from '../utils/appDocumentFile.js';

const DOCUMENTS_BUCKET = 'app-documents';
const META = {
  customers: 'meta/customer_directory.json',
  logins: 'meta/login_credentials.json',
  loginOrder: 'meta/login_credentials_order.json',
  infoFa: 'meta/invoice_info_records.json',
  documents: 'meta/app_documents.json',
} as const;

export type LoginOrderMap = { I: string[]; II: string[] };

const emptyLoginOrder = (): LoginOrderMap => ({ I: [], II: [] });

const normalizeLoginOrder = (value: unknown): LoginOrderMap => {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const asIds = (list: unknown) =>
    Array.isArray(list) ? list.map((id) => String(id || '')).filter(Boolean) : [];
  return { I: asIds(raw.I), II: asIds(raw.II) };
};

export const sortLoginRecordsByOrder = (
  records: LoginRecord[],
  order: LoginOrderMap,
): LoginRecord[] => {
  const byId = new Map(records.map((record) => [record.id, record]));
  const ordered: LoginRecord[] = [];
  const used = new Set<string>();

  for (const category of ['I', 'II'] as const) {
    for (const id of order[category] || []) {
      const record = byId.get(id);
      if (!record || record.kategoria !== category || used.has(id)) continue;
      ordered.push(record);
      used.add(id);
    }
  }

  for (const category of ['I', 'II'] as const) {
    for (const record of records) {
      if (record.kategoria !== category || used.has(record.id)) continue;
      ordered.push(record);
      used.add(record.id);
    }
  }

  return ordered;
};

const buildLoginOrderFromRecords = (records: LoginRecord[]): LoginOrderMap => ({
  I: records.filter((record) => record.kategoria === 'I').map((record) => record.id),
  II: records.filter((record) => record.kategoria === 'II').map((record) => record.id),
});


const throwIfError = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

const isMissingTableError = (error: { code?: string; message?: string } | null) =>
  Boolean(
    error &&
      (error.code === 'PGRST205' ||
        error.code === '42P01' ||
        /Could not find the table/i.test(error.message || '')),
  );

export const toCustomerDirectoryRow = (record: AdresaRecord) => ({
  id: record.id,
  p_c: record.pC || '',
  nazov_firmy: record.nazovFirmy || '',
  skratka: record.skratka || '',
  registrovana_adresa: record.registrovanaAdresa || '',
  krajina: record.krajina || '',
  ico: record.ico || '',
  dic: record.dic || '',
  ic_dph: record.icDph || '',
  telefonne_cislo: record.telefonneCislo || '',
  email: record.email || '',
  poznamka: record.poznamka || '',
  updated_at: new Date().toISOString(),
});

export const fromCustomerDirectoryRow = (row: Record<string, unknown>): AdresaRecord => ({
  id: String(row.id),
  pC: String(row.p_c || ''),
  nazovFirmy: String(row.nazov_firmy || ''),
  skratka: String(row.skratka || ''),
  registrovanaAdresa: String(row.registrovana_adresa || ''),
  krajina: String(row.krajina || ''),
  ico: String(row.ico || ''),
  dic: String(row.dic || ''),
  icDph: String(row.ic_dph || ''),
  telefonneCislo: String(row.telefonne_cislo || ''),
  email: String(row.email || ''),
  poznamka: String(row.poznamka || ''),
});

export const toLoginCredentialsRow = (record: LoginRecord) => ({
  id: record.id,
  sluzba: record.sluzba || '',
  odkaz: record.odkaz || '',
  prihlasenie: record.prihlasenie || '',
  heslo: record.heslo || '',
  kategoria: record.kategoria === 'II' ? 'II' : 'I',
  poznamka: record.poznamka || '',
  updated_at: new Date().toISOString(),
});

export const fromLoginCredentialsRow = (row: Record<string, unknown>): LoginRecord => ({
  id: String(row.id),
  sluzba: String(row.sluzba || ''),
  odkaz: String(row.odkaz || ''),
  prihlasenie: String(row.prihlasenie || ''),
  heslo: String(row.heslo || ''),
  kategoria: row.kategoria === 'II' ? 'II' : 'I',
  poznamka: String(row.poznamka || ''),
});

export const toInvoiceInfoRow = (record: InfoFaRecord) => ({
  id: record.id,
  nazov: record.nazov || '',
  popis: record.popis || '',
  dolezite_alert: Boolean(record.doleziteAlert),
  updated_at: new Date().toISOString(),
});

export const fromInvoiceInfoRow = (row: Record<string, unknown>): InfoFaRecord => ({
  id: String(row.id),
  nazov: String(row.nazov || ''),
  popis: String(row.popis || ''),
  doleziteAlert: Boolean(row.dolezite_alert),
});

export const fromAppDocumentRow = (row: Record<string, unknown>): AppDocument => {
  const createdAt = String(row.created_at || new Date().toISOString());
  const sizeBytes = Number(row.size_bytes) || 0;
  return {
    id: String(row.id),
    name: String(row.name || ''),
    note: String(row.note || ''),
    size: String(row.size_label || formatDocumentSizeLabel(sizeBytes)),
    date: formatDocumentDate(createdAt),
    storagePath: String(row.storage_path || ''),
  };
};

const toAppDocumentRow = (document: AppDocument & { sizeBytes?: number; createdAt?: string }) => ({
  id: document.id,
  name: document.name,
  note: document.note || '',
  size_label: document.size,
  size_bytes: document.sizeBytes || 0,
  storage_path: document.storagePath,
  created_at: document.createdAt || new Date().toISOString(),
});

type DirectoryMode = 'tables' | 'storage';

const detectMode = async (supabase: SupabaseClient): Promise<DirectoryMode> => {
  const { error } = await supabase.from('customer_directory').select('id').limit(1);
  if (isMissingTableError(error)) return 'storage';
  throwIfError(error);
  return 'tables';
};

const readJsonArray = async <T>(
  supabase: SupabaseClient,
  path: string,
): Promise<T[] | null> => {
  const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).download(path);
  if (error) {
    if (
      /not found|Object not found|404/i.test(error.message) ||
      (error as { statusCode?: string }).statusCode === '404'
    ) {
      return null;
    }
    throw new Error(error.message);
  }
  const text = await data.text();
  if (!text.trim()) return [];
  const parsed = JSON.parse(text) as unknown;
  return Array.isArray(parsed) ? (parsed as T[]) : [];
};

const writeJsonArray = async (
  supabase: SupabaseClient,
  path: string,
  value: unknown[],
) => {
  const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(
    path,
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
    { upsert: true, contentType: 'application/json' },
  );
  throwIfError(error);
};

const readJsonValue = async <T>(
  supabase: SupabaseClient,
  path: string,
): Promise<T | null> => {
  const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).download(path);
  if (error) {
    if (
      /not found|Object not found|404/i.test(error.message) ||
      (error as { statusCode?: string }).statusCode === '404'
    ) {
      return null;
    }
    throw new Error(error.message);
  }
  const text = await data.text();
  if (!text.trim()) return null;
  return JSON.parse(text) as T;
};

const writeJsonValue = async (supabase: SupabaseClient, path: string, value: unknown) => {
  const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(
    path,
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
    { upsert: true, contentType: 'application/json' },
  );
  throwIfError(error);
};

const readLoginOrder = async (supabase: SupabaseClient): Promise<LoginOrderMap> => {
  const stored = await readJsonValue<unknown>(supabase, META.loginOrder);
  return stored ? normalizeLoginOrder(stored) : emptyLoginOrder();
};

const writeLoginOrder = async (supabase: SupabaseClient, order: LoginOrderMap) => {
  await writeJsonValue(supabase, META.loginOrder, normalizeLoginOrder(order));
};

const applyStoredLoginOrder = async (
  supabase: SupabaseClient,
  records: LoginRecord[],
): Promise<LoginRecord[]> => {
  const stored = await readLoginOrder(supabase);
  const hasStored = stored.I.length > 0 || stored.II.length > 0;
  if (!hasStored) {
    const seeded = buildLoginOrderFromRecords(records);
    await writeLoginOrder(supabase, seeded);
    return records;
  }
  return sortLoginRecordsByOrder(records, stored);
};

const ensureStorageSeeded = async (supabase: SupabaseClient) => {
  const customers = await readJsonArray<AdresaRecord>(supabase, META.customers);
  if (customers === null) {
    await writeJsonArray(supabase, META.customers, INITIAL_ADRESY_RECORDS);
  }
  const logins = await readJsonArray<LoginRecord>(supabase, META.logins);
  if (logins === null) {
    await writeJsonArray(supabase, META.logins, INITIAL_LOGIN_RECORDS);
  }
  const infos = await readJsonArray<InfoFaRecord>(supabase, META.infoFa);
  if (infos === null) {
    await writeJsonArray(supabase, META.infoFa, INITIAL_INFO_FA_RECORDS);
  }
  const documents = await readJsonArray<Record<string, unknown>>(supabase, META.documents);
  if (documents === null) {
    await writeJsonArray(supabase, META.documents, []);
  }
};

const loadFromStorage = async (supabase: SupabaseClient) => {
  await ensureStorageSeeded(supabase);
  const [customers, logins, infos, documents] = await Promise.all([
    readJsonArray<AdresaRecord>(supabase, META.customers),
    readJsonArray<LoginRecord>(supabase, META.logins),
    readJsonArray<InfoFaRecord>(supabase, META.infoFa),
    readJsonArray<Record<string, unknown>>(supabase, META.documents),
  ]);
  return {
    adresyRecords: customers || [],
    loginRecords: await applyStoredLoginOrder(supabase, logins || []),
    infoFaRecords: infos || [],
    documents: (documents || []).map(fromAppDocumentRow),
  };
};

const ensureTablesSeeded = async (supabase: SupabaseClient) => {
  const [customers, logins, infos] = await Promise.all([
    supabase.from('customer_directory').select('id').limit(1),
    supabase.from('login_credentials').select('id').limit(1),
    supabase.from('invoice_info_records').select('id').limit(1),
  ]);
  throwIfError(customers.error);
  throwIfError(logins.error);
  throwIfError(infos.error);

  // If tables are empty, prefer any previously persisted Storage meta (bridge), else INITIAL.
  if (!(customers.data || []).length) {
    const fromStorage = await readJsonArray<AdresaRecord>(supabase, META.customers);
    const source =
      fromStorage && fromStorage.length > 0 ? fromStorage : INITIAL_ADRESY_RECORDS;
    const { error } = await supabase
      .from('customer_directory')
      .insert(source.map(toCustomerDirectoryRow));
    throwIfError(error);
  }
  if (!(logins.data || []).length) {
    const fromStorage = await readJsonArray<LoginRecord>(supabase, META.logins);
    const source =
      fromStorage && fromStorage.length > 0 ? fromStorage : INITIAL_LOGIN_RECORDS;
    const { error } = await supabase
      .from('login_credentials')
      .insert(source.map(toLoginCredentialsRow));
    throwIfError(error);
  }
  if (!(infos.data || []).length) {
    const fromStorage = await readJsonArray<InfoFaRecord>(supabase, META.infoFa);
    const source =
      fromStorage && fromStorage.length > 0 ? fromStorage : INITIAL_INFO_FA_RECORDS;
    const { error } = await supabase
      .from('invoice_info_records')
      .insert(source.map(toInvoiceInfoRow));
    throwIfError(error);
  }

  const docsCount = await supabase.from('app_documents').select('id').limit(1);
  throwIfError(docsCount.error);
  if (!(docsCount.data || []).length) {
    const fromStorage = await readJsonArray<Record<string, unknown>>(supabase, META.documents);
    if (fromStorage && fromStorage.length > 0) {
      const { error } = await supabase.from('app_documents').insert(
        fromStorage.map((row) => ({
          id: String(row.id),
          name: String(row.name || ''),
          note: String(row.note || ''),
          size_label: String(row.size_label || ''),
          size_bytes: Number(row.size_bytes) || 0,
          storage_path: String(row.storage_path || ''),
          created_at: String(row.created_at || new Date().toISOString()),
        })),
      );
      throwIfError(error);
    }
  }
};

/** Exact SKRATKA values from adresar.png — fill only when DB skratka is empty. */
const skratkaSeedForRecord = (record: AdresaRecord): string => {
  const existing = String(record.skratka || '').trim();
  if (existing) return existing;
  const byId = INITIAL_ADRESY_RECORDS.find((row) => row.id === record.id);
  if (byId?.skratka) return byId.skratka;
  const ico = String(record.ico || '').trim();
  if (ico) {
    const byIco = INITIAL_ADRESY_RECORDS.find((row) => String(row.ico || '').trim() === ico);
    if (byIco?.skratka) return byIco.skratka;
  }
  const name = String(record.nazovFirmy || '').trim().toLowerCase();
  const byName = INITIAL_ADRESY_RECORDS.find(
    (row) => String(row.nazovFirmy || '').trim().toLowerCase() === name,
  );
  return byName?.skratka || '';
};

const ensureCustomerSkratkaPopulated = async (supabase: SupabaseClient) => {
  const { data, error } = await supabase.from('customer_directory').select('*');
  if (error) {
    // Column may not exist yet — caller / admin must run migration SQL.
    if (/skratka/i.test(error.message || '')) return;
    throwIfError(error);
    return;
  }
  for (const row of data || []) {
    const record = fromCustomerDirectoryRow(row);
    if (String(record.skratka || '').trim()) continue;
    const skratka = skratkaSeedForRecord(record);
    if (!skratka) continue;
    const { error: updateError } = await supabase
      .from('customer_directory')
      .update({ skratka, updated_at: new Date().toISOString() })
      .eq('id', record.id);
    if (updateError && /skratka/i.test(updateError.message || '')) return;
    throwIfError(updateError);
  }
};

const loadFromTables = async (supabase: SupabaseClient) => {
  await ensureTablesSeeded(supabase);
  await ensureCustomerSkratkaPopulated(supabase);
  const [customers, logins, infos, documents] = await Promise.all([
    supabase.from('customer_directory').select('*').order('p_c', { ascending: true }),
    supabase.from('login_credentials').select('*').order('sluzba', { ascending: true }),
    supabase.from('invoice_info_records').select('*').order('created_at', { ascending: true }),
    supabase.from('app_documents').select('*').order('created_at', { ascending: false }),
  ]);
  throwIfError(customers.error);
  throwIfError(logins.error);
  throwIfError(infos.error);
  throwIfError(documents.error);

  return {
    adresyRecords: (customers.data || []).map(fromCustomerDirectoryRow),
    loginRecords: await applyStoredLoginOrder(
      supabase,
      (logins.data || []).map(fromLoginCredentialsRow),
    ),
    infoFaRecords: (infos.data || []).map(fromInvoiceInfoRow),
    documents: (documents.data || []).map(fromAppDocumentRow),
  };
};

export const loadDirectoryBootstrap = async (supabase: SupabaseClient) => {
  const mode = await detectMode(supabase);
  return mode === 'tables' ? loadFromTables(supabase) : loadFromStorage(supabase);
};

export const migrateBrowserDirectoryData = async (
  supabase: SupabaseClient,
  payload: {
    adresyRecords?: AdresaRecord[];
    loginRecords?: LoginRecord[];
    infoFaRecords?: InfoFaRecord[];
  },
) => {
  const mode = await detectMode(supabase);

  if (mode === 'tables') {
    const [customers, logins, infos] = await Promise.all([
      supabase.from('customer_directory').select('id').limit(1),
      supabase.from('login_credentials').select('id').limit(1),
      supabase.from('invoice_info_records').select('id').limit(1),
    ]);
    throwIfError(customers.error);
    throwIfError(logins.error);
    throwIfError(infos.error);

    if (!(customers.data || []).length) {
      const source =
        payload.adresyRecords && payload.adresyRecords.length > 0
          ? payload.adresyRecords
          : INITIAL_ADRESY_RECORDS;
      const { error } = await supabase
        .from('customer_directory')
        .upsert(source.map(toCustomerDirectoryRow), { onConflict: 'id' });
      throwIfError(error);
    }
    if (!(logins.data || []).length) {
      const source =
        payload.loginRecords && payload.loginRecords.length > 0
          ? payload.loginRecords
          : INITIAL_LOGIN_RECORDS;
      const { error } = await supabase
        .from('login_credentials')
        .upsert(source.map(toLoginCredentialsRow), { onConflict: 'id' });
      throwIfError(error);
    }
    if (!(infos.data || []).length) {
      const source =
        payload.infoFaRecords && payload.infoFaRecords.length > 0
          ? payload.infoFaRecords
          : INITIAL_INFO_FA_RECORDS;
      const { error } = await supabase
        .from('invoice_info_records')
        .upsert(source.map(toInvoiceInfoRow), { onConflict: 'id' });
      throwIfError(error);
    }
    return;
  }

  // Storage mode: import browser data only when meta file is missing.
  const customers = await readJsonArray<AdresaRecord>(supabase, META.customers);
  if (customers === null) {
    const source =
      payload.adresyRecords && payload.adresyRecords.length > 0
        ? payload.adresyRecords
        : INITIAL_ADRESY_RECORDS;
    await writeJsonArray(supabase, META.customers, source);
  }
  const logins = await readJsonArray<LoginRecord>(supabase, META.logins);
  if (logins === null) {
    const source =
      payload.loginRecords && payload.loginRecords.length > 0
        ? payload.loginRecords
        : INITIAL_LOGIN_RECORDS;
    await writeJsonArray(supabase, META.logins, source);
  }
  const infos = await readJsonArray<InfoFaRecord>(supabase, META.infoFa);
  if (infos === null) {
    const source =
      payload.infoFaRecords && payload.infoFaRecords.length > 0
        ? payload.infoFaRecords
        : INITIAL_INFO_FA_RECORDS;
    await writeJsonArray(supabase, META.infoFa, source);
  }
  const documents = await readJsonArray(supabase, META.documents);
  if (documents === null) {
    await writeJsonArray(supabase, META.documents, []);
  }
};

export const upsertAdresaRecord = async (
  supabase: SupabaseClient,
  record: AdresaRecord,
): Promise<AdresaRecord> => {
  const mode = await detectMode(supabase);
  if (mode === 'tables') {
    const { data, error } = await supabase
      .from('customer_directory')
      .upsert(toCustomerDirectoryRow(record), { onConflict: 'id' })
      .select('*')
      .single();
    if (error && /skratka/i.test(error.message || '')) {
      throw new Error(
        "V databáze chýba stĺpec SKRATKA. Spustite v Supabase SQL Editor: alter table public.customer_directory add column if not exists skratka text not null default '';",
      );
    }
    throwIfError(error);
    return fromCustomerDirectoryRow(data);
  }
  const list = (await readJsonArray<AdresaRecord>(supabase, META.customers)) || [];
  const idx = list.findIndex((item) => item.id === record.id);
  if (idx >= 0) list[idx] = record;
  else list.unshift(record);
  await writeJsonArray(supabase, META.customers, list);
  return record;
};

export const deleteAdresaRecord = async (supabase: SupabaseClient, id: string) => {
  const mode = await detectMode(supabase);
  if (mode === 'tables') {
    const { error } = await supabase.from('customer_directory').delete().eq('id', id);
    throwIfError(error);
    return;
  }
  const list = (await readJsonArray<AdresaRecord>(supabase, META.customers)) || [];
  await writeJsonArray(
    supabase,
    META.customers,
    list.filter((item) => item.id !== id),
  );
};

export const upsertLoginRecord = async (
  supabase: SupabaseClient,
  record: LoginRecord,
): Promise<LoginRecord> => {
  const mode = await detectMode(supabase);
  if (mode === 'tables') {
    const { error } = await supabase
      .from('login_credentials')
      .upsert(toLoginCredentialsRow(record), { onConflict: 'id' });
    throwIfError(error);
  } else {
    const list = (await readJsonArray<LoginRecord>(supabase, META.logins)) || [];
    const idx = list.findIndex((item) => item.id === record.id);
    if (idx >= 0) list[idx] = record;
    else list.unshift(record);
    await writeJsonArray(supabase, META.logins, list);
  }

  const order = await readLoginOrder(supabase);
  const category = record.kategoria === 'II' ? 'II' : 'I';
  const otherCategory = category === 'I' ? 'II' : 'I';
  order[otherCategory] = order[otherCategory].filter((id) => id !== record.id);
  if (!order[category].includes(record.id)) {
    order[category] = [...order[category], record.id];
  }
  await writeLoginOrder(supabase, order);
  return record;
};

export const deleteLoginRecord = async (supabase: SupabaseClient, id: string) => {
  const mode = await detectMode(supabase);
  if (mode === 'tables') {
    const { error } = await supabase.from('login_credentials').delete().eq('id', id);
    throwIfError(error);
  } else {
    const list = (await readJsonArray<LoginRecord>(supabase, META.logins)) || [];
    await writeJsonArray(
      supabase,
      META.logins,
      list.filter((item) => item.id !== id),
    );
  }

  const order = await readLoginOrder(supabase);
  order.I = order.I.filter((itemId) => itemId !== id);
  order.II = order.II.filter((itemId) => itemId !== id);
  await writeLoginOrder(supabase, order);
};

export const reorderLoginRecords = async (
  supabase: SupabaseClient,
  orderInput: LoginOrderMap,
): Promise<LoginOrderMap> => {
  const mode = await detectMode(supabase);
  const records =
    mode === 'tables'
      ? (
          await (async () => {
            const { data, error } = await supabase.from('login_credentials').select('*');
            throwIfError(error);
            return (data || []).map(fromLoginCredentialsRow);
          })()
        )
      : (await readJsonArray<LoginRecord>(supabase, META.logins)) || [];

  const validIds = new Set(records.map((record) => record.id));
  const sanitized: LoginOrderMap = {
    I: (orderInput.I || []).filter((id) => {
      const record = records.find((item) => item.id === id);
      return Boolean(record && record.kategoria === 'I' && validIds.has(id));
    }),
    II: (orderInput.II || []).filter((id) => {
      const record = records.find((item) => item.id === id);
      return Boolean(record && record.kategoria === 'II' && validIds.has(id));
    }),
  };

  // Keep any missing ids at the end of their category.
  for (const record of records) {
    const category = record.kategoria === 'II' ? 'II' : 'I';
    if (!sanitized[category].includes(record.id)) {
      sanitized[category].push(record.id);
    }
  }

  await writeLoginOrder(supabase, sanitized);

  if (mode !== 'tables') {
    await writeJsonArray(
      supabase,
      META.logins,
      sortLoginRecordsByOrder(records, sanitized),
    );
  }

  return sanitized;
};

export const upsertInfoFaRecord = async (
  supabase: SupabaseClient,
  record: InfoFaRecord,
): Promise<InfoFaRecord> => {
  const mode = await detectMode(supabase);
  if (mode === 'tables') {
    const { error } = await supabase
      .from('invoice_info_records')
      .upsert(toInvoiceInfoRow(record), { onConflict: 'id' });
    throwIfError(error);
    return record;
  }
  const list = (await readJsonArray<InfoFaRecord>(supabase, META.infoFa)) || [];
  const idx = list.findIndex((item) => item.id === record.id);
  if (idx >= 0) list[idx] = record;
  else list.unshift(record);
  await writeJsonArray(supabase, META.infoFa, list);
  return record;
};

export const deleteInfoFaRecord = async (supabase: SupabaseClient, id: string) => {
  const mode = await detectMode(supabase);
  if (mode === 'tables') {
    const { error } = await supabase.from('invoice_info_records').delete().eq('id', id);
    throwIfError(error);
    return;
  }
  const list = (await readJsonArray<InfoFaRecord>(supabase, META.infoFa)) || [];
  await writeJsonArray(
    supabase,
    META.infoFa,
    list.filter((item) => item.id !== id),
  );
};

export const upsertAppDocumentMeta = async (
  supabase: SupabaseClient,
  row: {
    id: string;
    name: string;
    note: string;
    size_label: string;
    size_bytes: number;
    storage_path: string;
    created_at: string;
  },
): Promise<AppDocument> => {
  const mode = await detectMode(supabase);
  if (mode === 'tables') {
    const { data, error } = await supabase
      .from('app_documents')
      .upsert(row, { onConflict: 'id' })
      .select('*')
      .single();
    throwIfError(error);
    return fromAppDocumentRow(data);
  }
  const list = (await readJsonArray<Record<string, unknown>>(supabase, META.documents)) || [];
  const idx = list.findIndex((item) => String(item.id) === row.id);
  if (idx >= 0) list[idx] = row;
  else list.unshift(row);
  await writeJsonArray(supabase, META.documents, list);
  return fromAppDocumentRow(row);
};

export const deleteAppDocumentMeta = async (
  supabase: SupabaseClient,
  id: string,
): Promise<string | null> => {
  const mode = await detectMode(supabase);
  if (mode === 'tables') {
    const { data: document, error: selectError } = await supabase
      .from('app_documents')
      .select('id, storage_path')
      .eq('id', id)
      .single();
    throwIfError(selectError);
    const storagePath = document.storage_path ? String(document.storage_path) : null;
    const { error } = await supabase.from('app_documents').delete().eq('id', id);
    throwIfError(error);
    return storagePath;
  }
  const list = (await readJsonArray<Record<string, unknown>>(supabase, META.documents)) || [];
  const existing = list.find((item) => String(item.id) === id);
  const storagePath = existing?.storage_path ? String(existing.storage_path) : null;
  await writeJsonArray(
    supabase,
    META.documents,
    list.filter((item) => String(item.id) !== id),
  );
  return storagePath;
};

export const getAppDocumentMeta = async (supabase: SupabaseClient, id: string) => {
  const mode = await detectMode(supabase);
  if (mode === 'tables') {
    const { data, error } = await supabase
      .from('app_documents')
      .select('id, name, storage_path')
      .eq('id', id)
      .single();
    throwIfError(error);
    return {
      id: String(data.id),
      name: String(data.name || 'document'),
      storagePath: String(data.storage_path || ''),
    };
  }
  const list = (await readJsonArray<Record<string, unknown>>(supabase, META.documents)) || [];
  const existing = list.find((item) => String(item.id) === id);
  if (!existing) throw new Error('Súbor nebol nájdený.');
  return {
    id: String(existing.id),
    name: String(existing.name || 'document'),
    storagePath: String(existing.storage_path || ''),
  };
};

// Keep helper export for potential direct row mapping in API.
export { toAppDocumentRow };
