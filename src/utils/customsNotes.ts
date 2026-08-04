/**
 * Pack/unpack POZNÁMKA + OPRAVA FAKTÚRY + invoice clip flags into int_poznamka
 * until dedicated columns exist in Supabase.
 * Sentinels use ASCII RS + tag (must never appear in normal user text).
 */
export const OPRAVA_FAKTURY_SEP = '\u001eOPRAVA_FAKTURY\u001e';
export const INVOICE_CLIP_SEP = '\u001eINVOICE_CLIP\u001e';

export type InvoiceClipState = 'none' | 'original' | 'pending' | 'corrected';

export function packCustomsNotes(
  intPoznamka: string,
  opravaFaktury: string,
  clipState: InvoiceClipState = 'none',
): string {
  const note = intPoznamka || '';
  const oprava = opravaFaktury || '';
  let packed = oprava ? `${note}${OPRAVA_FAKTURY_SEP}${oprava}` : note;
  if (clipState === 'pending' || clipState === 'corrected') {
    packed = `${packed}${INVOICE_CLIP_SEP}${clipState}`;
  }
  return packed;
}

export function unpackCustomsNotes(stored: string): {
  intPoznamka: string;
  opravaFaktury: string;
  invoiceClipState: InvoiceClipState;
} {
  const value = stored || '';
  let body = value;
  let invoiceClipState: InvoiceClipState = 'none';

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
    return { intPoznamka: body, opravaFaktury: '', invoiceClipState };
  }
  return {
    intPoznamka: body.slice(0, idx),
    opravaFaktury: body.slice(idx + OPRAVA_FAKTURY_SEP.length),
    invoiceClipState,
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
