import { createHash, timingSafeEqual } from 'node:crypto';
import {
  ApiRequest,
  ApiResponse,
  createSessionCookie,
  getSupabaseAdmin,
  isAuthorized,
  readJsonBody,
  sendError,
  sendJson,
} from '../src/server/apiUtils.js';

const passwordsMatch = (provided: string, expected: string) => {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
};

const isPermanentToken = (value: string) => /^[A-Za-z0-9_-]{43}$/.test(value);

/** Unlock via notification invoice link when the token matches a customs record. */
const unlockWithInvoiceToken = async (rawToken: string) => {
  const token = rawToken.trim();
  if (!isPermanentToken(token)) return false;

  const supabase = getSupabaseAdmin();
  let { data, error } = await supabase
    .from('customs_records')
    .select('id')
    .eq('invoice_token_hash', token)
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (!data) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const legacy = await supabase
      .from('customs_records')
      .select('id')
      .eq('invoice_token_hash', tokenHash)
      .maybeSingle();
    if (legacy.error) throw new Error(legacy.error.message);
    data = legacy.data;
  }

  return Boolean(data);
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    if (request.method === 'GET') {
      sendJson(response, 200, { authenticated: isAuthorized(request) });
      return;
    }

    if (request.method !== 'POST') {
      response.setHeader('Allow', 'GET, POST');
      sendJson(response, 405, { error: 'Method not allowed.' });
      return;
    }

    const body = await readJsonBody<{ password?: string; invoiceToken?: string }>(request);

    // Notification links (FAKTURÁCIA NOVEJ COLNICE / FAKTURÁCIA – OPRAVA FAKTÚRY).
    if (typeof body.invoiceToken === 'string' && body.invoiceToken.trim()) {
      const ok = await unlockWithInvoiceToken(body.invoiceToken);
      if (!ok) {
        sendJson(response, 401, { error: 'Unauthorized.' });
        return;
      }
      response.setHeader('Set-Cookie', createSessionCookie());
      sendJson(response, 200, { authenticated: true });
      return;
    }

    const expectedPassword = process.env.APP_ACCESS_PASSWORD;
    if (!expectedPassword) throw new Error('Missing APP_ACCESS_PASSWORD.');

    if (!body.password || !passwordsMatch(body.password, expectedPassword)) {
      sendJson(response, 401, { error: 'Nesprávne heslo' });
      return;
    }

    response.setHeader('Set-Cookie', createSessionCookie());
    sendJson(response, 200, { authenticated: true });
  } catch (error) {
    sendError(response, error);
  }
}
