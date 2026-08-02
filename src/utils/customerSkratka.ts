import type { AdresaRecord } from '../types';

/** Prefer SKRATKA for short display; never invent it from the legal name. */
export const resolveCustomerSkratka = (
  zakaznik: string,
  directory: AdresaRecord[],
): string => {
  const name = String(zakaznik || '').trim();
  if (!name) return name;
  const bySkratka = directory.find((d) => String(d.skratka || '').trim() === name);
  if (bySkratka) return String(bySkratka.skratka).trim();
  const byOfficial = directory.find((d) => String(d.nazovFirmy || '').trim() === name);
  if (byOfficial && String(byOfficial.skratka || '').trim()) {
    return String(byOfficial.skratka).trim();
  }
  return name;
};
