export interface ColnaRecord {
  id: string;
  zakaznik: string;
  isNew: boolean;
  bell: boolean;
  alert: boolean;
  datumColnice: string; // YYYY-MM-DD format or DD. MM. YYYY
  spz: string;
  refNaFa: string;
  ukToEu: string; // e.g., "zaclenie v UK", "vyclenie v EU", "zaclenie v UK; vyclenie v EU", ""
  euToUk: string; // e.g., "zaclenie v EU", "vyclenie v UK", ""
  faOdUkAgent: number;
  faOdEuAgent: number;
  colKonanie?: number;
  faKlient: number;
  intPoznamka: string;
  /** Instructions for accountant when correcting an already issued invoice. */
  opravaFaktury: string;
  zisk: number; // Auto-calculated: faKlient - faOdUkAgent - faOdEuAgent
  cisloFa: string;
  splatna: string;
  zaplatena: boolean;
  invoicePdfPath?: string;
  /** Correction notification sent — hide original pin until corrected invoice uploaded. */
  invoiceCorrectionPending?: boolean;
  /** Corrected invoice uploaded — show pinnew.png permanently when a PDF exists. */
  invoiceCorrected?: boolean;
  isClosed?: boolean;
  /** Permanent case-link token (stored in Supabase). Used to build secure_link. */
  invoiceToken?: string;
  /** Last EmailJS notification time (ISO from Supabase). */
  invoicingEmailSentAt?: string;
  /** Customer invoice email sent via Brevo (ISO timestamp; packed in oprava_faktury). */
  customerInvoiceEmailSentAt?: string;
}

export interface MonthlyReport {
  monthStart: string;
  year: number;
  month: number;
  recordCount: number;
  totalRevenue: number;
  totalCosts: number;
  totalProfit: number;
  isPaid: boolean;
}

export interface AppDocument {
  id: string;
  name: string;
  note: string;
  size: string;
  date: string;
  storagePath: string;
}

export interface AppBootstrap {
  activeMonth: string;
  activeReportYear: number;
  records: ColnaRecord[];
  reports: MonthlyReport[];
  adresyRecords: AdresaRecord[];
  loginRecords: LoginRecord[];
  infoFaRecords: InfoFaRecord[];
  documents: AppDocument[];
}

export interface AdresaRecord {
  id: string;
  pC: string;
  nazovFirmy: string;
  /** Short name for ZÁKAZNÍK dropdown — stored permanently, entered manually */
  skratka: string;
  registrovanaAdresa: string;
  krajina: string;
  ico: string;
  dic: string;
  icDph: string;
  telefonneCislo: string;
  /** EMAIL 1 — primary customer email (existing field, must not be renamed). */
  email: string;
  /** EMAIL 2 — optional additional customer email. */
  email2: string;
  /** EMAIL 3 — optional additional customer email. */
  email3: string;
  poznamka: string;
}

export interface LoginRecord {
  id: string;
  sluzba: string;
  odkaz: string;
  prihlasenie: string;
  heslo: string;
  kategoria: 'I' | 'II';
  poznamka?: string;
}

export interface InfoFaRecord {
  id: string;
  nazov: string;
  popis: string;
  doleziteAlert?: boolean;
}

export type ActiveTab =
  | 'COLNA_DATABAZA'
  | 'ADRESY'
  | 'LOGIN_UDAJE'
  | 'INFO_FA'
  | 'SUBORY'
  | 'COLNICA_GB_VAT_EORI'
  | 'COLNICA_EU_VAT_EORI'
  | 'COLNICA_GB_TARIFF'
  | 'COLNICA_EU_TARIFF'
  | 'COLNICA_REX'
  | string;
