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
