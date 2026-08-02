/** Build the permanent case link for a stored invoice token (current app origin). */
export const buildCaseLink = (invoiceToken?: string | null): string => {
  if (!invoiceToken) return '';
  const url = new URL(window.location.origin);
  url.searchParams.set('invoiceToken', invoiceToken);
  return url.toString();
};

/** Format Supabase timestamptz for the LINK notification field: DD.MM.YYYY HH:MM */
export const formatNotificationTimestamp = (iso?: string | null): string => {
  const parts = formatNotificationTimestampParts(iso);
  if (!parts) return '';
  return `${parts.date} ${parts.time}`;
};

/** Split notification timestamp for left-aligned date / right-aligned time (Europe/Bratislava). */
export const formatNotificationTimestampParts = (
  iso?: string | null,
): { date: string; time: string } | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Bratislava',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || '';

  const day = get('day');
  const month = get('month');
  const year = get('year');
  const hour = get('hour');
  const minute = get('minute');
  if (!day || !month || !year || !hour || !minute) return null;

  return {
    date: `${day}.${month}.${year}`,
    time: `${hour}:${minute}`,
  };
};
