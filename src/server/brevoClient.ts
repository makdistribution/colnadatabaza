/** Shared customer-invoice email copy (safe for browser + server). */

export const CUSTOMER_INVOICE_FROM = 'mak@distribution.sk';

export const CUSTOMER_INVOICE_EMAIL_BODY = [
  'Dobrý deň,',
  '',
  'v prílohe Vám zasielame fa. za sprostredkovanie colného konania.',
  '',
  'Splatnosť fa. je 14 dní od jej vystavenia.',
  '',
  'Ďakujem.',
  '',
  'S pozdravom / best regards',
].join('\n');

export const buildCustomerInvoiceSubject = (invoiceNumber: string) =>
  `Faktúra za colné služby č. ${String(invoiceNumber || '').trim()}`;
