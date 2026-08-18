/**
 * Server-side VAT-Search (company name → VAT/EORI).
 * Uses process.env.VATSEARCH_API_KEY only (never exposed to the client).
 */

const VAT_SEARCH_URL = 'https://api.vat-search.eu/v2/';

export type VatSearchErrorCode =
  | 'NO RESULTS'
  | 'API ERROR'
  | 'RATE LIMIT'
  | 'INVALID API KEY'
  | 'SERVICE UNAVAILABLE'
  | 'CONFIG ERROR'
  | 'VALIDATION ERROR';

export type VatSearchEoriNumber = {
  Number?: string;
  Name?: string;
  Address?: string;
  Valid?: boolean;
};

export type VatSearchResultItem = {
  ID?: string | number;
  Score?: number;
  CC?: string;
  Status?: string;
  Number?: string;
  Name?: string;
  Address?: string | string[];
  EoriNumbers?: VatSearchEoriNumber[];
  [key: string]: unknown;
};

export type VatSearchInfo = {
  Queries?: number;
  MaxQueries?: number;
  NumberOfResults?: number;
  MaxScore?: number;
  User?: string;
  [key: string]: unknown;
};

export type VatSearchLookupResult = {
  ok: boolean;
  errorCode?: VatSearchErrorCode;
  error?: string;
  httpStatus?: number;
  info?: VatSearchInfo | null;
  results: VatSearchResultItem[];
};

export type VatSearchParams = {
  companyName?: string;
  address?: string;
  countryCode?: string;
  cutoffScore?: number | string;
  livecheck?: boolean;
};

const requireVatSearchKey = () => {
  const value = String(process.env.VATSEARCH_API_KEY || '').trim();
  if (!value) {
    throw new Error('Missing VATSEARCH_API_KEY.');
  }
  return value;
};

const asResultArray = (value: unknown): VatSearchResultItem[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === 'object') as VatSearchResultItem[];
};

const mapHttpError = (status: number, detail?: string): VatSearchLookupResult => {
  if (status === 401 || status === 403) {
    return {
      ok: false,
      errorCode: 'INVALID API KEY',
      error: 'INVALID API KEY',
      httpStatus: status,
      results: [],
    };
  }
  if (status === 429) {
    return {
      ok: false,
      errorCode: 'RATE LIMIT',
      error: 'RATE LIMIT',
      httpStatus: status,
      results: [],
    };
  }
  if (status === 502 || status === 503 || status === 504) {
    return {
      ok: false,
      errorCode: 'SERVICE UNAVAILABLE',
      error: detail || 'SERVICE UNAVAILABLE',
      httpStatus: status,
      results: [],
    };
  }
  return {
    ok: false,
    errorCode: 'API ERROR',
    error: detail || 'API ERROR',
    httpStatus: status,
    results: [],
  };
};

/** Search companies via VAT-Search API (Bearer token). */
export const searchVatEori = async (params: VatSearchParams): Promise<VatSearchLookupResult> => {
  const companyName = String(params.companyName || '').trim();
  const address = String(params.address || '').trim();
  const countryCode = String(params.countryCode || '').trim().toUpperCase();
  const cutoffRaw = params.cutoffScore;
  const cutoffScore =
    cutoffRaw === undefined || cutoffRaw === null || String(cutoffRaw).trim() === ''
      ? 1
      : Number(cutoffRaw);
  const livecheck = params.livecheck !== false;

  if (!companyName) {
    return {
      ok: false,
      errorCode: 'VALIDATION ERROR',
      error: 'COMPANY NAME is required.',
      results: [],
    };
  }

  if (!Number.isFinite(cutoffScore) || cutoffScore < 0) {
    return {
      ok: false,
      errorCode: 'VALIDATION ERROR',
      error: 'CUTOFF SCORE must be a non-negative number.',
      results: [],
    };
  }

  let apiKey: string;
  try {
    apiKey = requireVatSearchKey();
  } catch {
    return {
      ok: false,
      errorCode: 'CONFIG ERROR',
      error: 'CONFIGURATION ERROR',
      results: [],
    };
  }

  const query = new URLSearchParams();
  query.set('n', companyName);
  if (address) query.set('a', address);
  if (countryCode) query.set('cc', countryCode);
  query.set('cutoff_score', String(cutoffScore));
  query.set('livecheck', livecheck ? '1' : '0');
  query.set('additionalChecks', 'eori');

  const url = `${VAT_SEARCH_URL}?${query.toString()}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });
  } catch {
    return {
      ok: false,
      errorCode: 'SERVICE UNAVAILABLE',
      error: 'SERVICE UNAVAILABLE',
      results: [],
    };
  }

  const text = await response.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  } catch {
    json = null;
  }

  if (!response.ok) {
    const detail =
      (json && typeof json.error === 'string' && json.error) ||
      (json && typeof json.Error === 'string' && json.Error) ||
      (json && typeof json.message === 'string' && json.message) ||
      undefined;
    return mapHttpError(response.status, detail);
  }

  if (!json || typeof json !== 'object') {
    return {
      ok: false,
      errorCode: 'API ERROR',
      error: 'API ERROR',
      httpStatus: response.status,
      results: [],
    };
  }

  const results = asResultArray(json.Results);
  const info =
    json.Info && typeof json.Info === 'object' ? (json.Info as VatSearchInfo) : null;

  if (results.length === 0) {
    return {
      ok: false,
      errorCode: 'NO RESULTS',
      error: 'NO RESULTS',
      httpStatus: response.status,
      info,
      results: [],
    };
  }

  return {
    ok: true,
    httpStatus: response.status,
    info,
    results,
  };
};
