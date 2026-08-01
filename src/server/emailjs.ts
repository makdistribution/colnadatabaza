interface InvoicingEmail {
  customerName: string;
  customsDate: string;
  vehicleRegistration: string;
  invoiceReference: string;
  secureLink: string;
}

const requiredEnvironmentValue = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
};

export const createInvoiceLink = (token: string) => {
  const baseUrl = requiredEnvironmentValue('APP_BASE_URL');
  const url = new URL(baseUrl);
  url.searchParams.set('invoiceToken', token);
  return url.toString();
};

export const sendInvoicingEmail = async (email: InvoicingEmail) => {
  const requestBody: Record<string, unknown> = {
    service_id: requiredEnvironmentValue('EMAILJS_SERVICE_ID'),
    template_id: requiredEnvironmentValue('EMAILJS_TEMPLATE_ID'),
    user_id: requiredEnvironmentValue('EMAILJS_PUBLIC_KEY'),
    template_params: {
      customer_name: email.customerName,
      customs_date: email.customsDate,
      vehicle_registration: email.vehicleRegistration,
      spz: email.vehicleRegistration,
      invoice_reference: email.invoiceReference,
      secure_link: email.secureLink,
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
