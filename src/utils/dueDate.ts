/** Format a local calendar date as YYYY-MM-DD. */
const toIsoDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const isValidYmd = (year: number, month: number, day: number): boolean => {
  if (year < 1000 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const dt = new Date(year, month - 1, day);
  return (
    dt.getFullYear() === year && dt.getMonth() === month - 1 && dt.getDate() === day
  );
};

/**
 * Display format for DÁTUM SPLATNOSTI — always DD.MM.YYYY (e.g. 20.08.2026).
 */
export const formatDueDateDisplay = (value?: string | null): string => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const dotted = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotted) {
    const day = Number(dotted[1]);
    const month = Number(dotted[2]);
    const year = Number(dotted[3]);
    if (!isValidYmd(year, month, day)) return raw;
    return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
  }

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    if (!isValidYmd(year, month, day)) return raw;
    return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
  }

  return raw;
};

/**
 * Parse user/API due-date text into YYYY-MM-DD for storage.
 * Accepts DD.MM.YYYY and YYYY-MM-DD.
 */
export const parseDueDateToIso = (value?: string | null): string => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const dotted = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotted) {
    const day = Number(dotted[1]);
    const month = Number(dotted[2]);
    const year = Number(dotted[3]);
    if (!isValidYmd(year, month, day)) return '';
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    if (!isValidYmd(year, month, day)) return '';
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }

  return '';
};

/**
 * Due date after invoice upload:
 * Invoice date + 15 calendar days (e.g. 06.08.2026 → 21.08.2026).
 */
export const calculateInvoiceDueDate = (invoiceDate: Date = new Date()): string => {
  const d = new Date(invoiceDate.getFullYear(), invoiceDate.getMonth(), invoiceDate.getDate());
  d.setDate(d.getDate() + 15);
  return toIsoDate(d);
};
