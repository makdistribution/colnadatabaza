/** Sanitize an uploaded invoice filename for safe storage object keys. */
export const sanitizeInvoiceFileName = (fileName: string): string => {
  const cleaned = fileName
    .replace(/[\\/]/g, '')
    .replace(/[^\w.\- ()áäčďéíĺľňóôŕšťúýžÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]/gi, '_')
    .trim();
  const base = cleaned || 'invoice.pdf';
  const withPdf = base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
  return withPdf.slice(0, 180);
};

/**
 * Extract ČÍSLO FAKTÚRY from the fixed accountant filename format:
 * mak_distribution_s_r_o-20260093.pdf → 20260093
 */
export const extractInvoiceNumberFromFileName = (fileName: string): string => {
  const base = (fileName.split(/[\\/]/).pop() || fileName).trim();
  const match = base.match(/-(\d+)\.pdf$/i);
  return match?.[1] || '';
};

export const invoicePathForRecord = (recordId: string, fileName: string): string =>
  `records/${recordId}/${sanitizeInvoiceFileName(fileName)}`;

/** Display name from stored storage path (last path segment). */
export const invoiceDisplayNameFromPath = (path?: string | null): string => {
  if (!path) return '';
  const name = path.split('/').pop() || '';
  // Legacy uploads used a fixed object name with no original filename.
  if (name === 'invoice.pdf') return 'FAKTÚRA NAHRATÁ';
  return name;
};
