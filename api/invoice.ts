import { createHash } from 'node:crypto';
import type { ColnaRecord } from '../src/types';
import {
  ApiRequest,
  ApiResponse,
  getSupabaseAdmin,
  sendError,
  sendJson,
} from '../src/server/apiUtils.js';

const fromDatabaseRecord = (record: Record<string, unknown>): ColnaRecord => ({
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
  intPoznamka: String(record.int_poznamka || ''),
  zisk: Number(record.zisk) || 0,
  cisloFa: String(record.cislo_fa || ''),
  splatna: String(record.splatna || ''),
  zaplatena: Boolean(record.zaplatena),
  isClosed: Boolean(record.is_closed),
});

const getToken = (request: ApiRequest) => {
  const queryToken = request.query?.token;
  if (typeof queryToken === 'string') return queryToken;
  const url = new URL(request.url || '/', `https://${request.headers.host || 'localhost'}`);
  return url.searchParams.get('token') || '';
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    sendJson(response, 405, { error: 'Method not allowed.' });
    return;
  }

  try {
    const token = getToken(request);
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      sendJson(response, 404, { error: 'Colný záznam sa nenašiel.' });
      return;
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const { data, error } = await getSupabaseAdmin()
      .from('customs_records')
      .select('*')
      .eq('invoice_token_hash', tokenHash)
      .not('invoicing_email_sent_at', 'is', null)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) {
      sendJson(response, 404, { error: 'Colný záznam sa nenašiel.' });
      return;
    }

    sendJson(response, 200, { record: fromDatabaseRecord(data) });
  } catch (error) {
    sendError(response, error);
  }
}
