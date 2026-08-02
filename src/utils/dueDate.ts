/** Format a local calendar date as YYYY-MM-DD. */
const toIsoDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Due date after invoice upload:
 * 14 calendar days starting from the day after the upload date
 * (upload date + 14 days; period begins the following day).
 */
export const calculateInvoiceDueDate = (uploadDate: Date = new Date()): string => {
  const d = new Date(uploadDate.getFullYear(), uploadDate.getMonth(), uploadDate.getDate());
  d.setDate(d.getDate() + 14);
  return toIsoDate(d);
};
