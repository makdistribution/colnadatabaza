/**
 * Pack/unpack POZNÁMKA + OPRAVA FAKTÚRY + invoice clip flags into oprava_faktury.
 * until dedicated columns exist in Supabase.
 * Sentinels use ASCII RS + tag (must never appear in normal user text).
 */
export const OPRAVA_FAKTURY_SEP = '\u001eOPRAVA_FAKTURY\u001e';
export const INVOICE_CLIP_SEP = '\u001eINVOICE_CLIP\u001e';
export const CUSTOMER_INVOICE_EMAIL_SEP = '\u001eCUSTOMER_INVOICE_EMAIL\u001e';

export type InvoiceClipState = 'none' | 'original' | 'pending' | 'corrected';

export function packCustomsNotes(
  intPoznamka: string,
  opravaFaktury: string,
  clipState: InvoiceClipState = 'none',
  customerInvoiceEmailSentAt?: string | null,
): string {
  const note = intPoznamka || '';
  const oprava = opravaFaktury || '';
  let packed = oprava ? `${note}${OPRAVA_FAKTURY_SEP}${oprava}` : note;
  if (clipState === 'pending' || clipState === 'corrected') {
    packed = `${packed}${INVOICE_CLIP_SEP}${clipState}`;
  }
  const sentAt = String(customerInvoiceEmailSentAt || '').trim();
  if (sentAt) {
    packed = `${packed}${CUSTOMER_INVOICE_EMAIL_SEP}${sentAt}`;
  }
  return packed;
}

export function unpackCustomsNotes(stored: string): {
  intPoznamka: string;
  opravaFaktury: string;
  invoiceClipState: InvoiceClipState;
  customerInvoiceEmailSentAt?: string;
} {
  const value = stored || '';
  let body = value;
  let invoiceClipState: InvoiceClipState = 'none';
  let customerInvoiceEmailSentAt: string | undefined;

  const emailIdx = body.indexOf(CUSTOMER_INVOICE_EMAIL_SEP);
  if (emailIdx !== -1) {
    const emailRaw = body.slice(emailIdx + CUSTOMER_INVOICE_EMAIL_SEP.length).trim();
    body = body.slice(0, emailIdx);
    if (emailRaw) customerInvoiceEmailSentAt = emailRaw;
  }

  const clipIdx = body.indexOf(INVOICE_CLIP_SEP);
  if (clipIdx !== -1) {
    const clipRaw = body.slice(clipIdx + INVOICE_CLIP_SEP.length).trim();
    body = body.slice(0, clipIdx);
    if (clipRaw === 'pending' || clipRaw === 'corrected') {
      invoiceClipState = clipRaw;
    }
  }

  const idx = body.indexOf(OPRAVA_FAKTURY_SEP);
  if (idx === -1) {
    return { intPoznamka: body, opravaFaktury: '', invoiceClipState, customerInvoiceEmailSentAt };
  }
  return {
    intPoznamka: body.slice(0, idx),
    opravaFaktury: body.slice(idx + OPRAVA_FAKTURY_SEP.length),
    invoiceClipState,
    customerInvoiceEmailSentAt,
  };
}

/** Table pin: none | original (pin.png) | corrected (pinnew.png). */
export function resolveInvoicePinIcon(record: {
  invoicePdfPath?: string;
  invoiceCorrectionPending?: boolean;
  invoiceCorrected?: boolean;
}): 'none' | 'original' | 'corrected' {
  if (record.invoiceCorrected) {
    return record.invoicePdfPath ? 'corrected' : 'none';
  }
  if (record.invoiceCorrectionPending) return 'none';
  if (record.invoicePdfPath) return 'original';
  return 'none';
}
