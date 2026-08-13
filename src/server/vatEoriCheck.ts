/**
 * Server-side VAT + EORI helpers.
 * - GB VAT → VAT Sense (process.env.VATSENSE_API_KEY)
 * - EU VAT → EuroValidate (process.env.EUROVALIDATE_API_KEY)
 * - GB EORI / EU EORI → Vatstack (process.env.VATSTACK_API_KEY)
 * API keys are never logged.
 */

export type CheckerRegion = 'GB' | 'EU';

export type CheckerStatus =
  | 'VALID'
  | 'INVALID'
  | 'SERVICE UNAVAILABLE'
  | 'RATE LIMIT REACHED'
  | 'FORMAT ERROR'
  | 'CONFIG ERROR';

export type CheckerLookupResult = {
  status: CheckerStatus;
  number?: string;
  companyName?: string;
  companyAddress?: string;
  country?: string;
  confidence?: string;
  source?: string;
  error?: string;
  /** GB EORI: valid registration but company name/address not disclosed (non-consent). */
  detailsUnavailable?: boolean;
};

const EUROVALIDATE_BASE = 'https://api.eurovalidate.com';
const VATSENSE_VALIDATE_URL = 'https://api.vatsense.com/1.0/validate';
const VATSTACK_VALIDATIONS_URL = 'https://api.vatstack.com/v1/validations';

const normalizeNumber = (value: string) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();

const requireEuroValidateKey = () => {
  const value = String(process.env.EUROVALIDATE_API_KEY || '').trim();
  if (!value) {
    throw new Error('Missing EUROVALIDATE_API_KEY.');
  }
  return value;
};

const requireVatSenseKey = () => {
  const value = String(process.env.VATSENSE_API_KEY || '').trim();
  if (!value) {
    throw new Error('Missing VATSENSE_API_KEY.');
  }
  return value;
};

const requireVatstackKey = () => {
  const value = String(process.env.VATSTACK_API_KEY || '').trim();
  if (!value) {
    throw new Error('Missing VATSTACK_API_KEY.');
  }
  return value;
};

const mapServiceUnavailable = (detail?: string): CheckerLookupResult => ({
  status: 'SERVICE UNAVAILABLE',
  error: detail || 'SERVICE UNAVAILABLE',
});

const mapRateLimit = (): CheckerLookupResult => ({
  status: 'RATE LIMIT REACHED',
  error: 'RATE LIMIT REACHED',
});

const mapConfigError = (detail?: string): CheckerLookupResult => ({
  status: 'CONFIG ERROR',
  error: detail || 'CONFIGURATION ERROR',
});

const mapFormatError = (detail?: string, number?: string): CheckerLookupResult => ({
  status: 'FORMAT ERROR',
  number,
  error: detail || 'Invalid number format.',
});

/** GB VAT: optionally prepend GB when the digit-only format is unambiguous. */
const normalizeVatForRegion = (rawNumber: string, region: CheckerRegion): string => {
  const normalized = normalizeNumber(rawNumber);
  if (!normalized) return '';
  if (region !== 'GB') return normalized;
  if (/^GB/i.test(normalized)) return normalized;
  // Unambiguous GB formats: 9 digits, or 9+3 branch digits, or 12 digits.
  if (/^\d{9}(\d{3})?$/.test(normalized)) {
    return `GB${normalized}`;
  }
  return normalized;
};

const extractErrorDetail = (payload: Record<string, unknown> | null): string | undefined => {
  if (!payload) return undefined;
  const nested =
    payload.error && typeof payload.error === 'object'
      ? (payload.error as Record<string, unknown>)
      : null;
  const detail = String(
    nested?.detail || nested?.title || payload.detail || payload.message || payload.title || '',
  ).trim();
  return detail || undefined;
};

const parseValidationOutcome = (
  statusRaw: unknown,
  validRaw: unknown,
): 'VALID' | 'INVALID' | 'SERVICE UNAVAILABLE' | null => {
  if (typeof validRaw === 'boolean') {
    return validRaw ? 'VALID' : 'INVALID';
  }
  const status = String(statusRaw || '')
    .trim()
    .toLowerCase();
  if (status === 'valid' || status === 'active') return 'VALID';
  if (status === 'invalid') return 'INVALID';
  if (status === 'error' || status === 'unavailable') return 'SERVICE UNAVAILABLE';
  return null;
};

type EuroValidateCallOk = {
  kind: 'ok';
  payload: Record<string, unknown>;
};

type EuroValidateCallFail = {
  kind: 'fail';
  result: CheckerLookupResult;
};

const callEuroValidate = async (
  path: string,
): Promise<EuroValidateCallOk | EuroValidateCallFail> => {
  let apiKey: string;
  try {
    apiKey = requireEuroValidateKey();
  } catch {
    return { kind: 'fail', result: mapConfigError('EUROVALIDATE_API_KEY is missing.') };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    const response = await fetch(`${EUROVALIDATE_BASE}${path}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-API-Key': apiKey,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

    if (response.status === 401 || response.status === 403) {
      return { kind: 'fail', result: mapConfigError('EuroValidate API key is missing or invalid.') };
    }
    if (response.status === 429) {
      return { kind: 'fail', result: mapRateLimit() };
    }
    if (response.status === 400 || response.status === 422) {
      const detail = extractErrorDetail(payload) || 'Invalid number format.';
      return {
        kind: 'fail',
        result: mapFormatError(detail),
      };
    }
    if (!response.ok) {
      return { kind: 'fail', result: mapServiceUnavailable() };
    }
    if (!payload) {
      return { kind: 'fail', result: mapServiceUnavailable() };
    }

    return { kind: 'ok', payload };
  } catch {
    return { kind: 'fail', result: mapServiceUnavailable() };
  }
};

const unwrapData = (payload: Record<string, unknown>): Record<string, unknown> => {
  const data = payload.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return payload;
};

const unwrapMeta = (payload: Record<string, unknown>, data: Record<string, unknown>) => {
  const metaRaw = (data.meta || payload.meta || {}) as Record<string, unknown>;
  const confidence = String(metaRaw.confidence || data.confidence || payload.confidence || '')
    .trim()
    .toUpperCase();
  const source = String(metaRaw.source || data.source || payload.source || '').trim();
  return {
    confidence: confidence || undefined,
    source: source || undefined,
    metaRaw,
  };
};

/** Preserve multi-line addresses from string APIs (VAT Sense / EuroValidate). */
const normalizeAddress = (value: unknown): string | undefined => {
  if (value == null) return undefined;
  if (typeof value === 'object') {
    return formatStructuredAddress(value);
  }
  const text = String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
  return text || undefined;
};

/**
 * Vatstack-style structured address → multi-line string.
 * Prefer response.address over company_address.
 * Order: line_1..line_4, city, state, postal_code, country_code (skip null/empty).
 */
const formatStructuredAddress = (address: unknown): string | undefined => {
  if (!address || typeof address !== 'object' || Array.isArray(address)) return undefined;
  const a = address as Record<string, unknown>;
  const lines = [
    a.line_1 ?? a.line1 ?? a.address_line_1,
    a.line_2 ?? a.line2 ?? a.address_line_2,
    a.line_3 ?? a.line3 ?? a.address_line_3,
    a.line_4 ?? a.line4 ?? a.address_line_4,
    a.city,
    a.state,
    a.postal_code ?? a.postcode ?? a.zip,
    a.country_code ?? a.country,
  ]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean);
  return lines.length > 0 ? lines.join('\n') : undefined;
};

/** Prefer structured `address`; fall back to `company_address` only when address is empty. */
const resolveCompanyAddress = (
  address: unknown,
  companyAddress: unknown,
): string | undefined => {
  const fromAddress = formatStructuredAddress(address);
  if (fromAddress) return fromAddress;
  if (typeof address === 'string' && address.trim()) {
    return normalizeAddress(address);
  }
  return normalizeAddress(companyAddress);
};

/** GB VAT via VAT Sense GET /1.0/validate?vat_number=... (Basic auth user:<api_key>). */
const validateGbVatViaVatSense = async (vatNumber: string): Promise<CheckerLookupResult> => {
  let apiKey: string;
  try {
    apiKey = requireVatSenseKey();
  } catch {
    return mapConfigError('CONFIGURATION ERROR: VATSENSE_API_KEY is missing.');
  }

  const auth = Buffer.from(`user:${apiKey}`).toString('base64');
  const endpoint = `${VATSENSE_VALIDATE_URL}?vat_number=${encodeURIComponent(vatNumber)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${auth}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

    if (response.status === 401 || response.status === 403) {
      return mapConfigError('CONFIGURATION ERROR: VATSENSE_API_KEY is missing or invalid.');
    }
    if (response.status === 429) {
      return mapRateLimit();
    }
    // 412 = upstream HMRC temporarily unavailable (per VAT Sense docs).
    if (response.status === 412 || response.status >= 500) {
      return mapServiceUnavailable();
    }
    if (!response.ok || !payload) {
      return mapServiceUnavailable(extractErrorDetail(payload));
    }

    const success = Boolean(payload.success);
    const data =
      payload.data && typeof payload.data === 'object'
        ? (payload.data as Record<string, unknown>)
        : ({} as Record<string, unknown>);
    const company =
      data.company && typeof data.company === 'object'
        ? (data.company as Record<string, unknown>)
        : ({} as Record<string, unknown>);

    if (!success) {
      const detail = extractErrorDetail(payload) || '';
      if (/unavailable|timeout|service|temporarily|412/i.test(detail)) {
        return mapServiceUnavailable(detail || undefined);
      }
      // Do not treat upstream/config failures as INVALID.
      return mapServiceUnavailable(detail || undefined);
    }

    if (typeof data.valid !== 'boolean') {
      return mapServiceUnavailable();
    }

    const country = String(company.country_code || data.country_code || 'GB').trim() || 'GB';
    const rawReturned = String(company.vat_number || data.vat_number || '').trim();
    const returnedNumber = rawReturned
      ? (/^[A-Z]{2}/i.test(rawReturned) ? rawReturned.toUpperCase() : `${country}${rawReturned}`)
      : vatNumber;
    const companyName = String(company.company_name || '').trim();
    const companyAddress = normalizeAddress(company.company_address);

    return {
      status: data.valid ? 'VALID' : 'INVALID',
      number: returnedNumber || vatNumber,
      companyName: companyName || undefined,
      companyAddress,
      country: country || undefined,
      source: 'vatsense',
    };
  } catch {
    return mapServiceUnavailable();
  }
};

/**
 * Validate VAT:
 * - region GB → VAT Sense
 * - region EU → EuroValidate
 */
export const validateVatNumber = async (
  rawNumber: string,
  region: CheckerRegion = 'EU',
): Promise<CheckerLookupResult> => {
  const vatNumber = normalizeVatForRegion(rawNumber, region);
  if (!vatNumber) {
    return mapFormatError('Enter a VAT number.');
  }
  if (region === 'EU' && !/^[A-Z]{2}/.test(vatNumber)) {
    return mapFormatError('EU VAT number must include the country prefix (e.g. SK, DE, FR).', vatNumber);
  }
  if (vatNumber.length < 4) {
    return mapFormatError('VAT number is too short.', vatNumber);
  }

  if (region === 'GB') {
    return validateGbVatViaVatSense(vatNumber);
  }

  const call = await callEuroValidate(`/v1/vat/${encodeURIComponent(vatNumber)}`);
  if (call.kind === 'fail') {
    return { ...call.result, number: call.result.number || vatNumber };
  }

  const data = unwrapData(call.payload);
  const outcome = parseValidationOutcome(
    data.status ?? call.payload.status,
    data.valid ?? call.payload.valid,
  );
  if (!outcome) {
    return mapServiceUnavailable();
  }
  if (outcome === 'SERVICE UNAVAILABLE') {
    return mapServiceUnavailable();
  }

  const meta = unwrapMeta(call.payload, data);
  const country = String(data.country_code || data.country || vatNumber.slice(0, 2) || '').trim();
  const returnedNumber = String(data.vat_number || vatNumber).trim();
  const companyName = String(data.company_name || data.name || '').trim();
  const companyAddress = normalizeAddress(data.company_address || data.address);

  return {
    status: outcome,
    number: returnedNumber || vatNumber,
    companyName: companyName || undefined,
    companyAddress,
    country: country || undefined,
    confidence: meta.confidence,
    source: meta.source,
  };
};

/** Validate EORI via Vatstack POST /v1/validations (type gb_eori | eu_eori). */
export const validateEoriNumber = async (
  rawNumber: string,
  region: CheckerRegion = 'EU',
): Promise<CheckerLookupResult> => {
  const eoriNumber = normalizeNumber(rawNumber);
  if (!eoriNumber) {
    return mapFormatError('Enter an EORI number.');
  }
  if (eoriNumber.length < 4) {
    return mapFormatError('EORI number is too short.', eoriNumber);
  }

  let apiKey: string;
  try {
    apiKey = requireVatstackKey();
  } catch {
    return mapConfigError('CONFIGURATION ERROR: VATSTACK_API_KEY is missing.');
  }

  const type = region === 'GB' ? 'gb_eori' : 'eu_eori';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    const response = await fetch(VATSTACK_VALIDATIONS_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-API-KEY': apiKey,
      },
      body: new URLSearchParams({ query: eoriNumber, type }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

    if (response.status === 401 || response.status === 403) {
      return mapConfigError('CONFIGURATION ERROR: VATSTACK_API_KEY is missing or invalid.');
    }
    if (response.status === 402) {
      return mapConfigError(extractErrorDetail(payload) || 'CONFIGURATION ERROR');
    }
    if (response.status === 429) {
      return mapRateLimit();
    }
    // 202 = accepted for async processing when government service did not return yet.
    if (response.status === 202) {
      return mapServiceUnavailable('PENDING/SERVICE UNAVAILABLE');
    }
    if (response.status === 400 || response.status === 422) {
      return mapFormatError(extractErrorDetail(payload) || 'Invalid number format.', eoriNumber);
    }
    if (!response.ok || !payload) {
      return mapServiceUnavailable(extractErrorDetail(payload));
    }

    const valid = payload.valid;
    const validFormat = payload.valid_format;
    const active = payload.active;

    if (typeof valid !== 'boolean') {
      return mapServiceUnavailable();
    }

    const country = String(payload.country_code || eoriNumber.slice(0, 2) || '').trim();
    const returnedNumber = String(payload.query || payload.eori_number || eoriNumber).trim();
    const companyName = String(payload.company_name || '').trim();
    const companyAddress = resolveCompanyAddress(payload.address, payload.company_address);

    if (!valid) {
      return {
        status: 'INVALID',
        number: returnedNumber || eoriNumber,
        country: country || undefined,
        source: 'vatstack',
      };
    }

    // valid=true (and optionally active) — company disclosure is independent.
    const detailsUnavailable =
      region === 'GB' &&
      !companyName &&
      !companyAddress &&
      (active === true || active == null);

    return {
      status: 'VALID',
      number: returnedNumber || eoriNumber,
      companyName: companyName || undefined,
      companyAddress,
      country: country || undefined,
      source: 'vatstack',
      detailsUnavailable: detailsUnavailable || undefined,
    };
  } catch {
    return mapServiceUnavailable();
  }
};
