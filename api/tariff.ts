import {
  ApiRequest,
  ApiResponse,
  isAuthorized,
  sendError,
  sendJson,
} from '../src/server/apiUtils.js';

const TOKEN_ENDPOINT = 'https://auth.id.trade-tariff.service.gov.uk/oauth2/token';
const API_BASE = 'https://api.trade-tariff.service.gov.uk/uk/api';
const ACCEPT_HEADER = 'application/vnd.hmrc.2.0+json';

/** Module-scope cache so warm serverless/dev-server instances reuse the access token. */
let cachedToken: { accessToken: string; expiresAt: number } | null = null;

const getCredentials = () => {
  const clientId = process.env.TRADE_TARIFF_CLIENT_ID;
  const clientSecret = process.env.TRADE_TARIFF_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Missing TRADE_TARIFF_CLIENT_ID / TRADE_TARIFF_CLIENT_SECRET.');
  }
  return { clientId, clientSecret };
};

async function getAccessToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }

  const { clientId, clientSecret } = getCredentials();
  const form = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  if (!response.ok) throw new Error(`Trade Tariff token request failed: ${response.status}`);

  const json = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error('Trade Tariff token response missing access_token.');

  const ttlMs = (json.expires_in ?? 3600) * 1000;
  cachedToken = { accessToken: json.access_token, expiresAt: Date.now() + ttlMs - 60_000 };
  return cachedToken.accessToken;
}

async function callTariffApi(path: string): Promise<Response> {
  let token = await getAccessToken();
  let response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: ACCEPT_HEADER },
  });

  if (response.status === 401) {
    token = await getAccessToken(true);
    response = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: ACCEPT_HEADER },
    });
  }

  return response;
}

const COMMODITY_CODE_PATTERN = /^\d{10}$/;

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (!isAuthorized(request)) {
    sendJson(response, 401, { error: 'Unauthorized.' });
    return;
  }

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    sendJson(response, 405, { error: 'Method not allowed.' });
    return;
  }

  try {
    const code = request.query?.code;
    const commodityCode = Array.isArray(code) ? code[0] : code;
    if (!commodityCode || !COMMODITY_CODE_PATTERN.test(commodityCode)) {
      sendJson(response, 400, { error: 'A 10-digit "code" query parameter is required.' });
      return;
    }

    const apiResponse = await callTariffApi(`/commodities/${commodityCode}`);
    const body = await apiResponse.json().catch(() => null);
    sendJson(response, apiResponse.status, body);
  } catch (error) {
    sendError(response, error);
  }
}
