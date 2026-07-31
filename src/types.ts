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
  faKlient: number;
  intPoznamka: string;
  zisk: number; // Auto-calculated: faKlient - faOdUkAgent - faOdEuAgent
  cisloFa: string;
  splatna: string;
  zaplatena: boolean;
  isClosed?: boolean;
}

export interface MonthlyReport {
  monthStart: string;
  year: number;
  month: number;
  recordCount: number;
  totalRevenue: number;
  totalCosts: number;
  totalProfit: number;
}

export interface AppBootstrap {
  activeMonth: string;
  activeReportYear: number;
  records: ColnaRecord[];
  reports: MonthlyReport[];
}

export interface AdresaRecord {
  id: string;
  pC: string;
  nazovFirmy: string;
  registrovanaAdresa: string;
  krajina: string;
  ico: string;
  dic: string;
  icDph: string;
  telefonneCislo: string;
  email: string;
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

export type ActiveTab = 'COLNA_DATABAZA' | 'ADRESY' | 'LOGIN_UDAJE' | 'INFO_FA' | 'SUBORY' | string;
