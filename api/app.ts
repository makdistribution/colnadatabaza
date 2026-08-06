import { randomBytes, randomUUID } from 'node:crypto';
import type {
  AdresaRecord,
  ColnaRecord,
  InfoFaRecord,
  LoginRecord,
} from '../src/types';
import {
  ApiRequest,
  ApiResponse,
  getSupabaseAdmin,
  isAuthorized,
  readJsonBody,
  sendError,
  sendJson,
} from '../src/server/apiUtils.js';
import {
  deleteAdresaRecord,
  deleteAppDocumentMeta,
  deleteInfoFaRecord,
  deleteLoginRecord,
  getAppDocumentMeta,
  loadDirectoryBootstrap,
  migrateBrowserDirectoryData,
  reorderLoginRecords,
  upsertAdresaRecord,
  upsertAppDocumentMeta,
  upsertInfoFaRecord,
  upsertLoginRecord,
  type LoginOrderMap,
} from '../src/server/directoryStore.js';
import { createInvoiceLink, sendInvoicingEmail } from '../src/server/emailjs.js';
import {
  packCustomsNotes,
  unpackCustomsNotes,
  type InvoiceClipState,
} from '../src/utils/customsNotes.js';
import {
  appDocumentPathForId,
  formatDocumentSizeLabel,
  sanitizeAppDocumentFileName,
} from '../src/utils/appDocumentFile.js';
import { extractInvoiceNumberFromFileName, invoicePathForRecord, sanitizeInvoiceFileName } from '../src/utils/invoiceFile.js';

type ActionBody = {
  action?:
    | 'saveRecord'
    | 'deleteRecords'
    | 'togglePaid'
    | 'closeMonth'
    | 'resetData'
    | 'prepareInvoiceUpload'
    | 'completeInvoiceUpload'
    | 'deleteInvoice'
    | 'getInvoiceDownloadUrl'
    | 'migrateBrowserData'
    | 'saveAdresaRecord'
    | 'deleteAdresaRecord'
    | 'saveLoginRecord'
    | 'deleteLoginRecord'
    | 'reorderLoginRecords'
    | 'saveInfoFaRecord'
    | 'deleteInfoFaRecord'
    | 'prepareDocumentUpload'
    | 'completeDocumentUpload'
    | 'deleteDocument'
    | 'getDocumentDownloadUrl';
  record?: Partial<ColnaRecord> & { invoiceHandoff?: boolean };
  adresaRecord?: AdresaRecord;
  loginRecord?: LoginRecord;
  loginOrder?: LoginOrderMap;
  infoFaRecord?: InfoFaRecord;
  adresyRecords?: AdresaRecord[];
  loginRecords?: LoginRecord[];
  infoFaRecords?: InfoFaRecord[];
  ids?: string[];
  id?: string;
  invoicePath?: string;
  storagePath?: string;
  fileName?: string;
  note?: string;
  sizeBytes?: number;
  splatna?: string | null;
  zaplatena?: boolean;
  clearNewBadge?: boolean;
  closeYear?: boolean;
};

const INVOICE_BUCKET = 'invoice-pdfs';
const DOCUMENTS_BUCKET = 'app-documents';
const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;

const monthStartFromDate = (date: string) => {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(date);
  if (!match) throw new Error('Dátum colnice musí byť vo formáte YYYY-MM-DD.');
  return `${match[1]}-${match[2]}-01`;
};

const toDatabaseRecord = (record: Partial<ColnaRecord>, id: string, monthStart: string) => ({
  id,
  month_start: monthStart,
  zakaznik: record.zakaznik || 'Petertransporte',
  is_new: record.isNew ?? true,
  bell: record.bell ?? false,
  alert: record.alert ?? false,
  datum_colnice: record.datumColnice,
  spz: record.spz || '',
  ref_na_fa: record.refNaFa || '',
  uk_to_eu: record.ukToEu || '',
  eu_to_uk: record.euToUk || '',
  fa_od_uk_agent: Number(record.faOdUkAgent) || 0,
  fa_od_eu_agent: Number(record.faOdEuAgent) || 0,
  fa_klient: Number(record.faKlient) || 0,
  // Pack OPRAVA + invoice clip flags into int_poznamka (no dedicated columns yet).
  int_poznamka: packCustomsNotes(
    record.intPoznamka || '',
    record.opravaFaktury || '',
    record.invoiceCorrected
      ? 'corrected'
      : record.invoiceCorrectionPending
        ? 'pending'
        : 'none',
  ),
  zisk: Number(record.zisk) || 0,
  cislo_fa: record.cisloFa || '',
  splatna: record.splatna || null,
  zaplatena: record.zaplatena ?? false,
  is_closed: record.isClosed ?? false,
  updated_at: new Date().toISOString(),
});

/** True when stored value is a legacy SHA-256 hex digest (not a displayable token). */
const isLegacyTokenHash = (value: string) => /^[a-f0-9]{64}$/i.test(value);

const isPermanentToken = (value: string) => /^[A-Za-z0-9_-]{43}$/.test(value);

const createPermanentToken = () => randomBytes(32).toString('base64url');

const fromDatabaseRecord = (record: Record<string, unknown>): ColnaRecord => {
  const storedToken = record.invoice_token_hash ? String(record.invoice_token_hash) : '';
  const invoiceToken = isPermanentToken(storedToken) ? storedToken : undefined;
  return {
    id: String(record.id),
    zakaznik: String(record.zakaznik || ''),
    isNew: Boolean(record.is_new),
    bell: Boolean(record.bell),
    alert: Boolean(record.alert),
    datumColnice: String(record.datum_colnice || ''),
    spz: String(record.spz || ''),
    refNaFa: String(record.ref_na_fa || ''),
    ukToEu: String(record.uk_to_eu || ''),
    euToUk: String(record.eu_to_uk || ''),
    faOdUkAgent: Number(record.fa_od_uk_agent) || 0,
    faOdEuAgent: Number(record.fa_od_eu_agent) || 0,
    faKlient: Number(record.fa_klient) || 0,
    ...(() => {
      const packed = unpackCustomsNotes(String(record.int_poznamka || ''));
      const fromColumn =
        record.oprava_faktury != null && record.oprava_faktury !== undefined
          ? String(record.oprava_faktury)
          : '';
      return {
        intPoznamka: packed.intPoznamka,
        opravaFaktury: fromColumn || packed.opravaFaktury,
        invoiceCorrectionPending: packed.invoiceClipState === 'pending',
        invoiceCorrected: packed.invoiceClipState === 'corrected',
      };
    })(),
    zisk: Number(record.zisk) || 0,
    cisloFa: String(record.cislo_fa || ''),
    splatna: String(record.splatna || '').slice(0, 10),
    zaplatena: Boolean(record.zaplatena),
    invoicePdfPath: record.invoice_pdf_path ? String(record.invoice_pdf_path) : undefined,
    isClosed: Boolean(record.is_closed),
    invoiceToken,
    invoicingEmailSentAt: record.invoicing_email_sent_at
      ? String(record.invoicing_email_sent_at)
      : undefined,
  };
};

const throwIfError = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

const deleteInvoicePdfs = async (recordIds: string[]) => {
  if (recordIds.length === 0) return;
  const supabase = getSupabaseAdmin();
  const { data, error: selectError } = await supabase
    .from('customs_records')
    .select('invoice_pdf_path')
    .in('id', recordIds);
  throwIfError(selectError);
  const paths = (data || [])
    .map((row) => (row.invoice_pdf_path ? String(row.invoice_pdf_path) : ''))
    .filter(Boolean);
  // Also remove legacy fixed-path objects for older uploads.
  const legacyPaths = recordIds.map((id) => `records/${id}/invoice.pdf`);
  const uniquePaths = [...new Set([...paths, ...legacyPaths])];
  if (uniquePaths.length === 0) return;
  const { error } = await supabase.storage.from(INVOICE_BUCKET).remove(uniquePaths);
  throwIfError(error);
};

/**
 * Send EmailJS notification at most once per save request that opts in.
 * Atomic claim on invoicing_email_claimed_at prevents concurrent duplicate sends.
 */
const sendInvoicingEmailIfRequested = async (
  record: Record<string, unknown>,
  wantsEmail: boolean,
  emailKind: 'new' | 'edit' = 'new',
): Promise<Record<string, unknown>> => {
  if (!wantsEmail) return record;

  const storedToken = record.invoice_token_hash ? String(record.invoice_token_hash) : '';
  if (!isPermanentToken(storedToken)) {
    throw new Error('Permanent case link is missing for this record.');
  }

  const supabase = getSupabaseAdmin();
  const recordId = String(record.id);

  // Re-read claim/sent from DB — the in-memory row can be stale under concurrent saves.
  const { data: latest, error: latestError } = await supabase
    .from('customs_records')
    .select('invoicing_email_claimed_at, invoicing_email_sent_at, bell, invoice_token_hash')
    .eq('id', recordId)
    .single();
  throwIfError(latestError);
  if (!latest) throw new Error('Záznam sa nenašiel.');

  const previousClaim = latest.invoicing_email_claimed_at
    ? String(latest.invoicing_email_claimed_at)
    : null;
  const previousSent = latest.invoicing_email_sent_at
    ? String(latest.invoicing_email_sent_at)
    : null;

  // Send already in progress for this row (claimed after last successful send).
  if (
    previousClaim &&
    (!previousSent || new Date(previousClaim).getTime() > new Date(previousSent).getTime())
  ) {
    return record;
  }

  const claimAt = new Date().toISOString();
  let claimQuery = supabase
    .from('customs_records')
    .update({
      invoicing_email_claimed_at: claimAt,
      bell: false,
      // Do NOT clear is_new here — NEW stays until accountant uploads + saves invoice.
      updated_at: claimAt,
    })
    .eq('id', recordId);

  claimQuery = previousClaim
    ? claimQuery.eq('invoicing_email_claimed_at', previousClaim)
    : claimQuery.is('invoicing_email_claimed_at', null);

  const { data: claimed, error: claimError } = await claimQuery.select('*').maybeSingle();
  throwIfError(claimError);

  // Another request won the claim — do not send a second email.
  if (!claimed) {
    const { data: current, error } = await supabase
      .from('customs_records')
      .select('*')
      .eq('id', recordId)
      .single();
    throwIfError(error);
    return current;
  }

  const secureLink = createInvoiceLink(String(claimed.invoice_token_hash || storedToken));

  try {
    await sendInvoicingEmail({
      customerName: String(claimed.zakaznik || ''),
      customsDate: String(claimed.datum_colnice || ''),
      vehicleRegistration: String(claimed.spz || ''),
      invoiceReference: String(claimed.ref_na_fa || ''),
      secureLink,
      kind: emailKind,
    });
  } catch (error) {
    // Roll back claim so a later SAVE can retry; never leave a stuck in-progress claim.
    await supabase
      .from('customs_records')
      .update({
        invoicing_email_claimed_at: previousClaim,
        bell: Boolean(record.bell),
        updated_at: new Date().toISOString(),
      })
      .eq('id', recordId)
      .eq('invoicing_email_claimed_at', claimAt);
    throw error;
  }

  const sentAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('customs_records')
    .update({
      invoicing_email_sent_at: sentAt,
      bell: false,
      // Keep is_new — notification to accountant must not remove NEW.
      updated_at: sentAt,
    })
    .eq('id', recordId)
    .select('*')
    .single();
  throwIfError(error);
  return data;
};

const initializeDatabase = async () => {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.rpc('initialize_app_state');
  throwIfError(error);
};

const ensureInitialized = async () => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('app_state')
    .select('singleton_id')
    .eq('singleton_id', 1)
    .maybeSingle();
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') {
      throw new Error('Supabase schema is missing. Run the Phase 1 migration first.');
    }
    throw new Error(error.message);
  }
  if (!data) await initializeDatabase();
};

const loadBootstrapData = async () => {
  await ensureInitialized();
  const supabase = getSupabaseAdmin();
  const [stateResult, recordsResult, reportsResult] = await Promise.all([
    supabase
      .from('app_state')
      .select('active_month, active_report_year')
      .eq('singleton_id', 1)
      .single(),
    supabase
      .from('customs_records')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false }),
    supabase.from('monthly_reports').select('*').order('month_start', { ascending: false }),
  ]);
  throwIfError(stateResult.error);
  throwIfError(recordsResult.error);
  throwIfError(reportsResult.error);

  const directory = await loadDirectoryBootstrap(supabase);

  return {
    activeMonth: stateResult.data.active_month,
    activeReportYear: stateResult.data.active_report_year,
    records: (recordsResult.data || []).map(fromDatabaseRecord),
    reports: (reportsResult.data || []).map((report) => ({
      monthStart: report.month_start,
      year: report.report_year,
      month: report.report_month,
      recordCount: report.record_count,
      totalRevenue: Number(report.total_revenue) || 0,
      totalCosts: Number(report.total_costs) || 0,
      totalProfit: Number(report.total_profit) || 0,
    })),
    ...directory,
  };
};

const prepareDocumentUpload = async (fileName: string) => {
  const id = randomUUID();
  const storagePath = appDocumentPathForId(id, fileName);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: true });
  throwIfError(error);
  return { id, storagePath, token: data.token };
};

const completeDocumentUpload = async (payload: {
  id: string;
  storagePath: string;
  fileName: string;
  note?: string;
  sizeBytes?: number;
}) => {
  const expectedPrefix = `files/${payload.id}/`;
  if (!payload.storagePath.startsWith(expectedPrefix)) {
    throw new Error('Neplatná cesta súboru.');
  }
  const fileName = sanitizeAppDocumentFileName(payload.fileName);
  if (payload.storagePath !== `${expectedPrefix}${fileName}`) {
    throw new Error('Neplatná cesta súboru.');
  }
  const sizeBytes = Number(payload.sizeBytes) || 0;
  if (sizeBytes <= 0 || sizeBytes > MAX_DOCUMENT_BYTES) {
    throw new Error('Súbor môže mať maximálne 50 MB.');
  }

  const supabase = getSupabaseAdmin();
  const { data: files, error: listError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .list(`files/${payload.id}`, { search: fileName });
  throwIfError(listError);
  if (!files?.some((file) => file.name === fileName)) {
    throw new Error('Nahraný súbor sa v úložisku nenašiel.');
  }

  const createdAt = new Date().toISOString();
  return upsertAppDocumentMeta(supabase, {
    id: payload.id,
    name: fileName,
    note: payload.note?.trim() || '',
    size_label: formatDocumentSizeLabel(sizeBytes),
    size_bytes: sizeBytes,
    storage_path: payload.storagePath,
    created_at: createdAt,
  });
};

const deleteDocument = async (id: string) => {
  const supabase = getSupabaseAdmin();
  const storagePath = await deleteAppDocumentMeta(supabase, id);
  if (storagePath) {
    const { error: removeError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .remove([storagePath]);
    throwIfError(removeError);
  }
};

const getDocumentDownloadUrl = async (id: string) => {
  const supabase = getSupabaseAdmin();
  const document = await getAppDocumentMeta(supabase, id);
  if (!document.storagePath) throw new Error('Súbor nemá úložnú cestu.');

  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(document.storagePath, 60, { download: document.name });
  throwIfError(error);
  return { url: data.signedUrl, fileName: document.name };
};

const saveRecord = async (record: Partial<ColnaRecord> & { invoiceHandoff?: boolean }) => {
  if (!record.datumColnice) throw new Error('Dátum colnice je povinný.');
  const supabase = getSupabaseAdmin();
  const { data: state, error: stateError } = await supabase
    .from('app_state')
    .select('active_month')
    .eq('singleton_id', 1)
    .single();
  throwIfError(stateError);

  const targetMonth = monthStartFromDate(record.datumColnice);
  const isUpdate = Boolean(record.id);
  const id = record.id || randomUUID();
  let isClosed = false;
  let permanentToken = '';
  let existingIsNew = false;
  let existingAlert = false;
  let clipState: InvoiceClipState = 'none';
  // Accountant opened the permanent email link — save invoice/data without OPRAVA.
  const isInvoiceHandoff = Boolean(record.invoiceHandoff);
  // Email is opt-in per SAVE only (never from persisted OPRAVA/bell flags alone).
  // Create / late-send from NÁHĽAD: "Odoslať na fakturáciu" (bell).
  // Edit: "upozornenie o zmene" (alert). Invoice handoff never sends.
  const wantsEmail = isInvoiceHandoff
    ? false
    : Boolean(record.bell) || (isUpdate && Boolean(record.alert));

  if (isUpdate) {
    const { data: existing, error } = await supabase
      .from('customs_records')
      .select('month_start, is_closed, invoice_token_hash, is_new, alert, invoice_pdf_path, int_poznamka')
      .eq('id', id)
      .single();
    throwIfError(error);
    if (existing.month_start !== targetMonth) {
      throw new Error('Záznam nemožno presunúť do iného mesiaca.');
    }
    isClosed = Boolean(existing.is_closed);
    existingIsNew = Boolean(existing.is_new);
    existingAlert = Boolean(existing.alert);
    const existingClip = unpackCustomsNotes(String(existing.int_poznamka || '')).invoiceClipState;
    clipState = existingClip;
    // Accountant save with invoice already on record → clear NEW permanently.
    if (isInvoiceHandoff && existing.invoice_pdf_path) {
      existingIsNew = false;
    }
    // Correction notification sent → hide original pin until corrected invoice is uploaded.
    if (!isInvoiceHandoff && Boolean(record.alert) && wantsEmail && clipState !== 'corrected') {
      clipState = 'pending';
    }
    // Handoff in correction workflow keeps corrected permanently; pending until upload completes.
    if (isInvoiceHandoff && clipState === 'corrected') {
      clipState = 'corrected';
    }
    const existingToken = existing.invoice_token_hash ? String(existing.invoice_token_hash) : '';
    // Never replace a valid permanent token. Backfill only when missing/legacy hash.
    permanentToken =
      isPermanentToken(existingToken) && !isLegacyTokenHash(existingToken)
        ? existingToken
        : createPermanentToken();
  } else if (targetMonth !== state.active_month) {
    throw new Error('Nové záznamy možno pridávať iba do aktívneho mesiaca.');
  } else {
    permanentToken = createPermanentToken();
  }

  // NEW vs OPRAVA:
  // - create: NEW from form
  // - update: never restore NEW; never clear NEW here (cleared only after accountant invoice save)
  // - invoice handoff: preserve NEW/OPRAVA (accountant does not edit customs flags)
  const databaseRecord = {
    ...toDatabaseRecord(
      {
        ...record,
        isClosed,
        invoiceCorrectionPending: clipState === 'pending',
        invoiceCorrected: clipState === 'corrected',
      },
      id,
      targetMonth,
    ),
    invoice_token_hash: permanentToken,
    is_new: isUpdate ? existingIsNew : Boolean(record.isNew ?? true),
    alert: isUpdate ? (isInvoiceHandoff ? existingAlert : true) : false,
  };

  // Insert new rows with a fresh created_at (newest first in bootstrap order).
  // Updates must never rewrite created_at, so position stays fixed.
  let data: Record<string, unknown> | null = null;
  if (isUpdate) {
    const updated = await supabase
      .from('customs_records')
      .update(databaseRecord)
      .eq('id', id)
      .select('*')
      .single();
    throwIfError(updated.error);
    data = updated.data;
  } else {
    // Retry token on the extremely rare unique-index collision.
    let insertError: { message: string; code?: string } | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const token = attempt === 0 ? permanentToken : createPermanentToken();
      const inserted = await supabase
        .from('customs_records')
        .insert({
          ...databaseRecord,
          invoice_token_hash: token,
          created_at: new Date().toISOString(),
        })
        .select('*')
        .single();
      if (!inserted.error) {
        data = inserted.data;
        insertError = null;
        break;
      }
      insertError = inserted.error;
      const isUniqueConflict =
        inserted.error.code === '23505' ||
        /duplicate|unique/i.test(inserted.error.message || '');
      if (!isUniqueConflict) break;
    }
    throwIfError(insertError);
  }

  if (!data) throw new Error('Záznam sa nepodarilo uložiť.');
  const afterEmail = await sendInvoicingEmailIfRequested(
    data,
    wantsEmail,
    Boolean(record.bell) ? 'new' : isUpdate ? 'edit' : 'new',
  );
  return fromDatabaseRecord(afterEmail);
};

const prepareInvoiceUpload = async (recordId: string, fileName: string) => {
  const supabase = getSupabaseAdmin();
  const { data: record, error: recordError } = await supabase
    .from('customs_records')
    .select('id, invoice_pdf_path')
    .eq('id', recordId)
    .single();
  throwIfError(recordError);

  const invoicePath = invoicePathForRecord(String(record.id), fileName);
  const previousPath = record.invoice_pdf_path ? String(record.invoice_pdf_path) : '';
  if (previousPath && previousPath !== invoicePath) {
    await supabase.storage.from(INVOICE_BUCKET).remove([previousPath]);
  }

  const { data, error } = await supabase.storage
    .from(INVOICE_BUCKET)
    .createSignedUploadUrl(invoicePath, { upsert: true });
  throwIfError(error);
  return { invoicePath, token: data.token };
};

const completeInvoiceUpload = async (
  recordId: string,
  invoicePath: string,
  splatna?: string,
  clearNewBadge = false,
) => {
  const expectedPrefix = `records/${recordId}/`;
  if (!invoicePath.startsWith(expectedPrefix)) throw new Error('Neplatná cesta faktúry.');
  const fileName = sanitizeInvoiceFileName(invoicePath.slice(expectedPrefix.length));
  if (invoicePath !== `${expectedPrefix}${fileName}`) throw new Error('Neplatná cesta faktúry.');

  const supabase = getSupabaseAdmin();
  const { data: files, error: listError } = await supabase.storage
    .from(INVOICE_BUCKET)
    .list(`records/${recordId}`, { search: fileName });
  throwIfError(listError);
  if (!files?.some((file) => file.name === fileName)) {
    throw new Error('Nahraná faktúra sa v úložisku nenašla.');
  }

  const { data: existingRow, error: existingError } = await supabase
    .from('customs_records')
    .select('int_poznamka')
    .eq('id', recordId)
    .single();
  throwIfError(existingError);
  const existingPacked = unpackCustomsNotes(String(existingRow.int_poznamka || ''));
  let nextClip: InvoiceClipState = existingPacked.invoiceClipState;
  // Correction workflow upload → permanent pinnew.png state.
  if (nextClip === 'pending' || nextClip === 'corrected') {
    nextClip = 'corrected';
  }

  const updatePayload: Record<string, unknown> = {
    invoice_pdf_path: invoicePath,
    cislo_fa: extractInvoiceNumberFromFileName(fileName),
    int_poznamka: packCustomsNotes(
      existingPacked.intPoznamka,
      existingPacked.opravaFaktury,
      nextClip,
    ),
    updated_at: new Date().toISOString(),
  };
  // NEW is removed only after accountant upload + successful save.
  if (clearNewBadge) {
    updatePayload.is_new = false;
  }
  if (splatna) {
    updatePayload.splatna = splatna;
  }

  const { data, error } = await supabase
    .from('customs_records')
    .update(updatePayload)
    .eq('id', recordId)
    .select('*')
    .single();
  throwIfError(error);
  return fromDatabaseRecord(data);
};

const deleteInvoice = async (recordId: string) => {
  const supabase = getSupabaseAdmin();
  const { data: record, error: recordError } = await supabase
    .from('customs_records')
    .select('id, invoice_pdf_path')
    .eq('id', recordId)
    .single();
  throwIfError(recordError);

  const paths = [
    record.invoice_pdf_path ? String(record.invoice_pdf_path) : '',
    `records/${recordId}/invoice.pdf`,
  ].filter(Boolean);
  if (paths.length > 0) {
    const { error: removeError } = await supabase.storage.from(INVOICE_BUCKET).remove([...new Set(paths)]);
    throwIfError(removeError);
  }

  // Never restore NEW after it was cleared (e.g. after first invoicing email).
  const { data, error } = await supabase
    .from('customs_records')
    .update({
      invoice_pdf_path: null,
      splatna: null,
      cislo_fa: '',
      updated_at: new Date().toISOString(),
    })
    .eq('id', recordId)
    .select('*')
    .single();
  throwIfError(error);
  return fromDatabaseRecord(data);
};

const getInvoiceDownloadUrl = async (recordId: string) => {
  const supabase = getSupabaseAdmin();
  const { data: record, error: recordError } = await supabase
    .from('customs_records')
    .select('id, invoice_pdf_path')
    .eq('id', recordId)
    .single();
  throwIfError(recordError);

  const storagePath = record.invoice_pdf_path ? String(record.invoice_pdf_path) : '';
  if (!storagePath) throw new Error('Faktúra nie je nahratá.');

  const fileName = sanitizeInvoiceFileName(storagePath.split('/').pop() || 'invoice.pdf');
  const { data, error } = await supabase.storage
    .from(INVOICE_BUCKET)
    .createSignedUrl(storagePath, 60, { download: fileName });
  throwIfError(error);
  return { url: data.signedUrl, fileName };
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (!isAuthorized(request)) {
    sendJson(response, 401, { error: 'Unauthorized.' });
    return;
  }

  try {
    if (request.method === 'GET') {
      sendJson(response, 200, await loadBootstrapData());
      return;
    }

    if (request.method !== 'POST') {
      response.setHeader('Allow', 'GET, POST');
      sendJson(response, 405, { error: 'Method not allowed.' });
      return;
    }

    await ensureInitialized();
    const body = await readJsonBody<ActionBody>(request);
    const supabase = getSupabaseAdmin();

    if (body.action === 'saveRecord' && body.record) {
      const record = await saveRecord(body.record);
      sendJson(response, 200, { record, bootstrap: await loadBootstrapData() });
      return;
    }

    if (body.action === 'prepareInvoiceUpload' && body.id && body.fileName) {
      sendJson(response, 200, await prepareInvoiceUpload(body.id, body.fileName));
      return;
    }

    if (body.action === 'completeInvoiceUpload' && body.id && body.invoicePath) {
      const record = await completeInvoiceUpload(
        body.id,
        body.invoicePath,
        body.splatna || undefined,
        Boolean(body.clearNewBadge),
      );
      sendJson(response, 200, { record, bootstrap: await loadBootstrapData() });
      return;
    }

    if (body.action === 'deleteInvoice' && body.id) {
      const record = await deleteInvoice(body.id);
      sendJson(response, 200, { record, bootstrap: await loadBootstrapData() });
      return;
    }

    if (body.action === 'getInvoiceDownloadUrl' && body.id) {
      sendJson(response, 200, await getInvoiceDownloadUrl(body.id));
      return;
    }

    if (body.action === 'deleteRecords' && body.ids?.length) {
      await deleteInvoicePdfs(body.ids);
      const { error } = await supabase.from('customs_records').delete().in('id', body.ids);
      throwIfError(error);
      sendJson(response, 200, { success: true, bootstrap: await loadBootstrapData() });
      return;
    }

    if (body.action === 'togglePaid' && body.id && typeof body.zaplatena === 'boolean') {
      const { data, error } = await supabase
        .from('customs_records')
        .update({ zaplatena: body.zaplatena, updated_at: new Date().toISOString() })
        .eq('id', body.id)
        .select('*')
        .single();
      throwIfError(error);
      sendJson(response, 200, {
        record: fromDatabaseRecord(data),
        bootstrap: await loadBootstrapData(),
      });
      return;
    }

    if (body.action === 'closeMonth') {
      const { data, error } = await supabase.rpc('close_current_month', {
        close_year: body.closeYear ?? false,
      });
      throwIfError(error);
      sendJson(response, 200, { result: data, bootstrap: await loadBootstrapData() });
      return;
    }

    if (body.action === 'resetData') {
      const { data: records, error: recordsError } = await supabase
        .from('customs_records')
        .select('id');
      throwIfError(recordsError);
      await deleteInvoicePdfs((records || []).map((record) => String(record.id)));

      for (const table of ['monthly_reports', 'customs_records', 'app_state', 'months']) {
        const { error } = await supabase.from(table).delete().not(
          table === 'app_state' ? 'singleton_id' : table === 'months' || table === 'monthly_reports'
            ? 'month_start'
            : 'id',
          'is',
          null,
        );
        throwIfError(error);
      }
      await initializeDatabase();
      sendJson(response, 200, { bootstrap: await loadBootstrapData() });
      return;
    }

    if (body.action === 'migrateBrowserData') {
      await migrateBrowserDirectoryData(supabase, {
        adresyRecords: body.adresyRecords,
        loginRecords: body.loginRecords,
        infoFaRecords: body.infoFaRecords,
      });
      sendJson(response, 200, { bootstrap: await loadBootstrapData() });
      return;
    }

    if (body.action === 'saveAdresaRecord' && body.adresaRecord) {
      const record = await upsertAdresaRecord(supabase, body.adresaRecord);
      sendJson(response, 200, {
        record,
        bootstrap: await loadBootstrapData(),
      });
      return;
    }

    if (body.action === 'deleteAdresaRecord' && body.id) {
      await deleteAdresaRecord(supabase, body.id);
      sendJson(response, 200, { success: true, bootstrap: await loadBootstrapData() });
      return;
    }

    if (body.action === 'saveLoginRecord' && body.loginRecord) {
      await upsertLoginRecord(supabase, body.loginRecord);
      sendJson(response, 200, { bootstrap: await loadBootstrapData() });
      return;
    }

    if (body.action === 'deleteLoginRecord' && body.id) {
      await deleteLoginRecord(supabase, body.id);
      sendJson(response, 200, { success: true, bootstrap: await loadBootstrapData() });
      return;
    }

    if (body.action === 'reorderLoginRecords' && body.loginOrder) {
      await reorderLoginRecords(supabase, body.loginOrder);
      sendJson(response, 200, { bootstrap: await loadBootstrapData() });
      return;
    }

    if (body.action === 'saveInfoFaRecord' && body.infoFaRecord) {
      await upsertInfoFaRecord(supabase, body.infoFaRecord);
      sendJson(response, 200, { bootstrap: await loadBootstrapData() });
      return;
    }

    if (body.action === 'deleteInfoFaRecord' && body.id) {
      await deleteInfoFaRecord(supabase, body.id);
      sendJson(response, 200, { success: true, bootstrap: await loadBootstrapData() });
      return;
    }

    if (body.action === 'prepareDocumentUpload' && body.fileName) {
      sendJson(response, 200, await prepareDocumentUpload(body.fileName));
      return;
    }

    if (
      body.action === 'completeDocumentUpload' &&
      body.id &&
      body.storagePath &&
      body.fileName
    ) {
      const document = await completeDocumentUpload({
        id: body.id,
        storagePath: body.storagePath,
        fileName: body.fileName,
        note: body.note,
        sizeBytes: body.sizeBytes,
      });
      sendJson(response, 200, { document, bootstrap: await loadBootstrapData() });
      return;
    }

    if (body.action === 'deleteDocument' && body.id) {
      await deleteDocument(body.id);
      sendJson(response, 200, { success: true, bootstrap: await loadBootstrapData() });
      return;
    }

    if (body.action === 'getDocumentDownloadUrl' && body.id) {
      sendJson(response, 200, await getDocumentDownloadUrl(body.id));
      return;
    }

    sendJson(response, 400, { error: 'Invalid action.' });
  } catch (error) {
    sendError(response, error);
  }
}
