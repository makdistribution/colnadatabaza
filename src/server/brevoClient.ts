/** Shared customer-invoice email copy (safe for browser + server). */

export const CUSTOMER_INVOICE_FROM = 'mak@distribution.sk';

export const CUSTOMER_INVOICE_EMAIL_BODY = [
  'Dobrý deň,',
  '',
  'v prílohe Vám zasielame fa. za sprostredkovanie colného konania.',
  '',
  'Splatnosť fa. je 14 dní od jej vystavenia.',
  '',
  'Ďakujem za jej včasnú úhradu.',
  '',
  'S pozdravom / best regards',
].join('\n');

export const buildCustomerInvoiceSubject = (invoiceNumber: string) =>
  `Faktúra za colné služby č. ${String(invoiceNumber || '').trim()}`;

/** Default invoice email HTML — splatnosť line is bold, as in the compose template. */
export const buildCustomerInvoiceEmailHtml = () =>
  [
    '<div>Dobrý deň,</div>',
    '<div><br></div>',
    '<div>v prílohe Vám zasielame fa. za sprostredkovanie colného konania.</div>',
    '<div><br></div>',
    '<div><b>Splatnosť fa. je 14 dní od jej vystavenia.</b></div>',
    '<div><br></div>',
    '<div>Ďakujem za jej včasnú úhradu.</div>',
    '<div><br></div>',
    '<div>S pozdravom / best regards</div>',
  ].join('');
