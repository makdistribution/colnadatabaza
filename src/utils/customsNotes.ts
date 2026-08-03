/**
 * Pack/unpack POZNÁMKA + OPRAVA FAKTÚRY into int_poznamka until/unless
 * a dedicated oprava_faktury column exists in Supabase.
 * Sentinel must never appear in normal user text (uses ASCII RS + tag).
 */
export const OPRAVA_FAKTURY_SEP = '\u001eOPRAVA_FAKTURY\u001e';

export function packCustomsNotes(intPoznamka: string, opravaFaktury: string): string {
  const note = intPoznamka || '';
  const oprava = opravaFaktury || '';
  if (!oprava) return note;
  return `${note}${OPRAVA_FAKTURY_SEP}${oprava}`;
}

export function unpackCustomsNotes(stored: string): {
  intPoznamka: string;
  opravaFaktury: string;
} {
  const value = stored || '';
  const idx = value.indexOf(OPRAVA_FAKTURY_SEP);
  if (idx === -1) {
    return { intPoznamka: value, opravaFaktury: '' };
  }
  return {
    intPoznamka: value.slice(0, idx),
    opravaFaktury: value.slice(idx + OPRAVA_FAKTURY_SEP.length),
  };
}
