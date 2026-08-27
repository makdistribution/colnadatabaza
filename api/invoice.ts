import { createHash } from 'node:crypto';
import type { AdresaRecord, ColnaRecord } from '../src/types';
import {
  ApiRequest,
  ApiResponse,
  getSupabaseAdmin,
  isAuthorized,
  sendError,
  sendJson,
} from '../src/server/apiUtils.js';
import { unpackCustomsNotes } from '../src/utils/customsNotes.js';
import { loadDirectoryBootstrap } from '../src/server/directoryStore.js';

const isPermanentToken = (value: string) => /^[A-Za-z0-9_-]{43}$/.test(value);

const fromDatabaseRecord = (record: Record<string, unknown>): ColnaRecord => {
  const storedToken = record.invoice_token_hash ? String(record.invoice_token_hash) : '';
  const invoiceToken = isPermanentToken(storedToken) ? storedToken : undefined;
  const packed = unpackCustomsNotes(String(record.oprava_faktury || ''));
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
    intPoznamka: packed.intPoznamka,
    opravaFaktury: packed.opravaFaktury,
    invoiceCorrectionPending: packed.invoiceClipState === 'pending',
    invoiceCorrected: packed.invoiceClipState === 'corrected',
    customerInvoiceEmailSentAt: packed.customerInvoiceEmailSentAt,
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

/** Extract and normalize invoice token from query string. */
const getToken = (request: ApiRequest) => {
  const queryToken = request.query?.token;
  let raw = '';
  if (typeof queryToken === 'string') raw = queryToken;
  else if (Array.isArray(queryToken) && typeof queryToken[0] === 'string') raw = queryToken[0];
  else {
    const url = new URL(request.url || '/', `https://${request.headers.host || 'localhost'}`);
    raw = url.searchParams.get('token') || '';
  }

  let token = raw.trim();
  try {
    // Decode once if the client double-encoded the token.
    if (token.includes('%')) token = decodeURIComponent(token);
  } catch {
    // keep trimmed raw token
  }
  return token.trim();
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    sendJson(response, 405, { error: 'Method not allowed.' });
    return;
  }

  // Permanent case links open the full app after login — resolve only for authenticated users.
  // Never return "not found" for unauthenticated requests (login must come first).
  if (!isAuthorized(request)) {
    sendJson(response, 401, { error: 'Unauthorized.' });
    return;
  }

  try {
    const token = getToken(request);
    if (!isPermanentToken(token)) {
      sendJson(response, 404, { error: 'Colný záznam sa nenašiel.' });
      return;
    }

    const supabase = getSupabaseAdmin();

    // Preferred: permanent plaintext token stored in invoice_token_hash.
    let { data, error } = await supabase
      .from('customs_records')
      .select('*')
      .eq('invoice_token_hash', token)
      .maybeSingle();
    if (error) throw new Error(error.message);

    // Legacy fallback: older rows stored a SHA-256 digest of the emailed token.
    if (!data) {
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const legacy = await supabase
        .from('customs_records')
        .select('*')
        .eq('invoice_token_hash', tokenHash)
        .maybeSingle();
      if (legacy.error) throw new Error(legacy.error.message);
      data = legacy.data;
    }

    if (!data) {
      sendJson(response, 404, { error: 'Colný záznam sa nenašiel.' });
      return;
    }

    const directory = await loadDirectoryBootstrap(supabase);
    sendJson(response, 200, {
      record: fromDatabaseRecord(data),
      adresyRecords: directory.adresyRecords,
    });
  } catch (error) {
    sendError(response, error);
  }
}
