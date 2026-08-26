import {
  CUSTOMER_INVOICE_EMAIL_BODY,
  CUSTOMER_INVOICE_FROM,
  buildCustomerInvoiceSubject,
} from './brevoClient.js';

export {
  CUSTOMER_INVOICE_EMAIL_BODY,
  CUSTOMER_INVOICE_FROM,
  buildCustomerInvoiceSubject,
} from './brevoClient.js';

interface CustomerInvoiceEmail {
  /** One or more recipient addresses. */
  toEmails: string[];
  toName?: string;
  fromEmail?: string;
  ccEmails?: string[];
  bccEmail?: string;
  invoiceNumber: string;
  attachmentFileName: string;
  attachmentBase64: string;
  /** Rich HTML body from the email editor (includes signature when present). */
  htmlBody: string;
}

const requiredEnvironmentValue = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
};

const htmlToPlainText = (html: string) =>
  String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const normalizeRecipients = (emails: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of emails || []) {
    const email = String(raw || '').trim();
    if (!email || !email.includes('@')) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(email);
  }
  return result;
};

/** Send customer invoice PDF via Brevo transactional email API. */
export const sendCustomerInvoiceEmail = async (email: CustomerInvoiceEmail) => {
  const toEmails = normalizeRecipients(email.toEmails);
  if (toEmails.length === 0) {
    throw new Error('Chýba platný email zákazníka v adresári.');
  }

  const ccEmails = normalizeRecipients(email.ccEmails || []);

  const fromEmail = String(email.fromEmail || CUSTOMER_INVOICE_FROM).trim() || CUSTOMER_INVOICE_FROM;
  if (!fromEmail.includes('@')) {
    throw new Error('Chýba platný odosielateľ (FROM).');
  }

  const bccEmail = String(email.bccEmail || CUSTOMER_INVOICE_FROM).trim() || CUSTOMER_INVOICE_FROM;

  const invoiceNumber = String(email.invoiceNumber || '').trim();
  if (!invoiceNumber) {
    throw new Error('Chýba číslo faktúry.');
  }

  const attachmentFileName = String(email.attachmentFileName || '').trim();
  const attachmentBase64 = String(email.attachmentBase64 || '').trim();
  if (!attachmentFileName || !attachmentBase64) {
    throw new Error('Chýba príloha faktúry PDF.');
  }

  const htmlContent = String(email.htmlBody || '').trim() || '<div><br></div>';
  const textContent = htmlToPlainText(htmlContent);

  const apiKey = requiredEnvironmentValue('BREVO_API_KEY');
  const subject = buildCustomerInvoiceSubject(invoiceNumber);
  const toName = String(email.toName || '').trim();

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: {
        email: fromEmail,
        name: process.env.BREVO_SENDER_NAME || 'MAK DISTRIBUTION',
      },
      to: toEmails.map((toEmail, index) => ({
        email: toEmail,
        ...(index === 0 && toName ? { name: toName } : {}),
      })),
      ...(ccEmails.length > 0
        ? {
            cc: ccEmails.map((ccEmail) => ({
              email: ccEmail,
            })),
          }
        : {}),
      ...(bccEmail && bccEmail.includes('@')
        ? {
            bcc: [
              {
                email: bccEmail,
              },
            ],
          }
        : {}),
      subject,
      textContent,
      htmlContent,
      attachment: [
        {
          name: attachmentFileName,
          content: attachmentBase64,
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Brevo send failed (${response.status}): ${detail || response.statusText}`);
  }
};
