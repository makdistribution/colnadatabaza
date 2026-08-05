interface InvoicingEmail {
  customerName: string;
  customsDate: string;
  vehicleRegistration: string;
  invoiceReference: string;
  secureLink: string;
  /** NEW customs → default EMAILJS_TEMPLATE_ID; EDIT → template_myjr2fb */
  kind?: 'new' | 'edit';
}

const EDIT_NOTIFICATION_TEMPLATE_ID = 'template_myjr2fb';

/** Current local calendar date for EmailJS templates (Europe/Bratislava → DD.MM.YYYY). */
const formatEmailDate = (date = new Date()): string => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Bratislava',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(date);
  const day = parts.find((part) => part.type === 'day')?.value || '';
  const month = parts.find((part) => part.type === 'month')?.value || '';
  const year = parts.find((part) => part.type === 'year')?.value || '';
  return `${day}.${month}.${year}`;
};

const requiredEnvironmentValue = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
};

export const createInvoiceLink = (token: string) => {
  const baseUrl = requiredEnvironmentValue('APP_BASE_URL').trim();
  const url = new URL(baseUrl);
  url.searchParams.set('invoiceToken', token);
  const link = url.toString();
  if (!token || !link.includes('invoiceToken=')) {
    throw new Error('Failed to build permanent case link for EmailJS.');
  }
  return link;
};

export const sendInvoicingEmail = async (email: InvoicingEmail) => {
  const secureLink = String(email.secureLink || '').trim();
  if (!secureLink || !/^https?:\/\//i.test(secureLink)) {
    throw new Error('EmailJS secure_link is missing or invalid.');
  }

  const templateId =
    email.kind === 'edit'
      ? EDIT_NOTIFICATION_TEMPLATE_ID
      : requiredEnvironmentValue('EMAILJS_TEMPLATE_ID');

  const requestBody: Record<string, unknown> = {
    service_id: requiredEnvironmentValue('EMAILJS_SERVICE_ID'),
    template_id: templateId,
    user_id: requiredEnvironmentValue('EMAILJS_PUBLIC_KEY'),
    template_params: {
      customer_name: email.customerName,
      customs_date: email.customsDate,
      vehicle_registration: email.vehicleRegistration,
      spz: email.vehicleRegistration,
      invoice_reference: email.invoiceReference,
      // Existing EmailJS template variable — full permanent case link (clickable URL text).
      secure_link: secureLink,
      emailDate: formatEmailDate(),
    },
  };

  if (process.env.EMAILJS_PRIVATE_KEY) {
    requestBody.accessToken = process.env.EMAILJS_PRIVATE_KEY;
  }

  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`EmailJS send failed (${response.status}): ${detail || response.statusText}`);
  }
};
