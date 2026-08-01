import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { INITIAL_COLNA_RECORDS } from '../src/data/initialData.js';
import type { ColnaRecord } from '../src/types';
import {
  ApiRequest,
  ApiResponse,
  getSupabaseAdmin,
  isAuthorized,
  readJsonBody,
  sendError,
  sendJson,
} from '../src/server/apiUtils.js';
import { createInvoiceLink, sendInvoicingEmail } from '../src/server/emailjs.js';

type ActionBody = {
  action?: 'saveRecord' | 'deleteRecords' | 'togglePaid' | 'closeMonth' | 'resetData';
  record?: Partial<ColnaRecord>;
  ids?: string[];
  id?: string;
  zaplatena?: boolean;
  closeYear?: boolean;
};

const ACTIVE_SEED_MONTH = '2026-07-01';

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
  int_poznamka: record.intPoznamka || '',
  zisk: Number(record.zisk) || 0,
  cislo_fa: record.cisloFa || '',
  splatna: record.splatna || null,
  zaplatena: record.zaplatena ?? false,
  is_closed: record.isClosed ?? false,
  updated_at: new Date().toISOString(),
});

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

const throwIfError = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

const sendInvoicingEmailOnce = async (record: Record<string, unknown>) => {
  if (!record.bell) return;

  const supabase = getSupabaseAdmin();
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const claimedAt = new Date().toISOString();
  const { data: claimedRecord, error: claimError } = await supabase
    .from('customs_records')
    .update({
      invoice_token_hash: tokenHash,
      invoicing_email_claimed_at: claimedAt,
    })
    .eq('id', record.id)
    .is('invoicing_email_sent_at', null)
    .is('invoicing_email_claimed_at', null)
    .select('id')
    .maybeSingle();
  throwIfError(claimError);

  // A missing row means this record was already claimed or emailed.
  if (!claimedRecord) return;

  try {
    await sendInvoicingEmail({
      customerName: String(record.zakaznik || ''),
      customsDate: String(record.datum_colnice || ''),
      vehicleRegistration: String(record.spz || ''),
      invoiceReference: String(record.ref_na_fa || ''),
      secureLink: createInvoiceLink(token),
    });

    const { error: sentError } = await supabase
      .from('customs_records')
      .update({ invoicing_email_sent_at: new Date().toISOString() })
      .eq('id', record.id)
      .eq('invoicing_email_claimed_at', claimedAt);
    throwIfError(sentError);
  } catch (error) {
    await supabase
      .from('customs_records')
      .update({
        invoice_token_hash: null,
        invoicing_email_claimed_at: null,
      })
      .eq('id', record.id)
      .eq('invoicing_email_claimed_at', claimedAt)
      .is('invoicing_email_sent_at', null);
    throw error;
  }
};

const seedDatabase = async () => {
  const supabase = getSupabaseAdmin();
  const monthStarts = Array.from(
    new Set(INITIAL_COLNA_RECORDS.map((record) => monthStartFromDate(record.datumColnice))),
  );
  if (!monthStarts.includes(ACTIVE_SEED_MONTH)) monthStarts.push(ACTIVE_SEED_MONTH);

  const { error: monthError } = await supabase.from('months').upsert(
    monthStarts.map((monthStart) => ({
      month_start: monthStart,
      status: monthStart === ACTIVE_SEED_MONTH ? 'active' : 'closed',
      closed_at: monthStart === ACTIVE_SEED_MONTH ? null : new Date().toISOString(),
    })),
  );
  throwIfError(monthError);

  const records = INITIAL_COLNA_RECORDS.map((record) => {
    const monthStart = monthStartFromDate(record.datumColnice);
    return toDatabaseRecord(
      { ...record, isClosed: monthStart !== ACTIVE_SEED_MONTH },
      record.id,
      monthStart,
    );
  });
  const { error: recordsError } = await supabase.from('customs_records').upsert(records);
  throwIfError(recordsError);

  const reports = monthStarts
    .filter((monthStart) => monthStart !== ACTIVE_SEED_MONTH)
    .map((monthStart) => {
      const monthRecords = records.filter((record) => record.month_start === monthStart);
      return {
        month_start: monthStart,
        report_year: Number(monthStart.slice(0, 4)),
        report_month: Number(monthStart.slice(5, 7)),
        record_count: monthRecords.length,
        total_revenue: monthRecords.reduce((sum, record) => sum + record.fa_klient, 0),
        total_costs: monthRecords.reduce(
          (sum, record) => sum + record.fa_od_uk_agent + record.fa_od_eu_agent,
          0,
        ),
        total_profit: monthRecords.reduce((sum, record) => sum + record.zisk, 0),
      };
    });
  if (reports.length > 0) {
    const { error: reportsError } = await supabase.from('monthly_reports').upsert(reports);
    throwIfError(reportsError);
  }

  const { error: stateError } = await supabase.from('app_state').upsert({
    singleton_id: 1,
    active_month: ACTIVE_SEED_MONTH,
    active_report_year: 2026,
    updated_at: new Date().toISOString(),
  });
  throwIfError(stateError);
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
  if (!data) await seedDatabase();
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
    supabase.from('customs_records').select('*').order('datum_colnice', { ascending: false }),
    supabase.from('monthly_reports').select('*').order('month_start', { ascending: false }),
  ]);
  throwIfError(stateResult.error);
  throwIfError(recordsResult.error);
  throwIfError(reportsResult.error);

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
  };
};

const saveRecord = async (record: Partial<ColnaRecord>) => {
  if (!record.datumColnice) throw new Error('Dátum colnice je povinný.');
  const supabase = getSupabaseAdmin();
  const { data: state, error: stateError } = await supabase
    .from('app_state')
    .select('active_month')
    .eq('singleton_id', 1)
    .single();
  throwIfError(stateError);

  const targetMonth = monthStartFromDate(record.datumColnice);
  const id = record.id || randomUUID();
  let isClosed = false;

  if (record.id) {
    const { data: existing, error } = await supabase
      .from('customs_records')
      .select('month_start, is_closed')
      .eq('id', record.id)
      .single();
    throwIfError(error);
    if (existing.month_start !== targetMonth) {
      throw new Error('Záznam nemožno presunúť do iného mesiaca.');
    }
    isClosed = Boolean(existing.is_closed);
  } else if (targetMonth !== state.active_month) {
    throw new Error('Nové záznamy možno pridávať iba do aktívneho mesiaca.');
  }

  const databaseRecord = toDatabaseRecord({ ...record, isClosed }, id, targetMonth);
  const { data, error } = await supabase
    .from('customs_records')
    .upsert(databaseRecord)
    .select('*')
    .single();
  throwIfError(error);
  await sendInvoicingEmailOnce(data);
  return fromDatabaseRecord(data);
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

    if (body.action === 'deleteRecords' && body.ids?.length) {
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
      await seedDatabase();
      sendJson(response, 200, { bootstrap: await loadBootstrapData() });
      return;
    }

    sendJson(response, 400, { error: 'Invalid action.' });
  } catch (error) {
    sendError(response, error);
  }
}
