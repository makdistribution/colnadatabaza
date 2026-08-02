/** Sanitize an uploaded app-document filename for safe storage object keys. */
export const sanitizeAppDocumentFileName = (fileName: string): string => {
  const cleaned = fileName
    .replace(/[\\/]/g, '')
    .replace(/[^\w.\- ()áäčďéíĺľňóôŕšťúýžÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]/gi, '_')
    .trim();
  const base = cleaned || 'document';
  return base.slice(0, 180);
};

export const appDocumentPathForId = (documentId: string, fileName: string): string =>
  `files/${documentId}/${sanitizeAppDocumentFileName(fileName)}`;

export const formatDocumentDate = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('sk-SK');
};

export const formatDocumentSizeLabel = (sizeBytes: number): string =>
  `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
