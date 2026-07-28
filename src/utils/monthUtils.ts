export const MONTH_NAMES = [
  'JANUÁR', 'FEBRUÁR', 'MAREC', 'APRÍL', 'MÁJ', 'JÚN',
  'JÚL', 'AUGUST', 'SEPTEMBER', 'OKTÓBER', 'NOVEMBER', 'DECEMBER'
];

export function parseMonthYear(my: string): { month: number; year: number } {
  if (!my) return { month: 7, year: 2026 };

  if (my.includes('/')) {
    const parts = my.split('/').map(s => s.trim());
    if (parts.length >= 2) {
      const mStr = parts[0].toUpperCase();
      const yStr = parts[1];
      const year = parseInt(yStr, 10) || 2026;
      const monthIdx = MONTH_NAMES.findIndex(n => n === mStr);
      if (monthIdx !== -1) {
        return { month: monthIdx + 1, year };
      }
      const num = parseInt(mStr, 10);
      if (!isNaN(num) && num >= 1 && num <= 12) {
        return { month: num, year };
      }
    }
  } else if (my.includes('•')) {
    const [mStr, yStr] = my.split('•').map(s => s.trim());
    return { month: parseInt(mStr, 10) || 7, year: parseInt(yStr, 10) || 2026 };
  }

  return { month: 7, year: 2026 };
}

export function formatMonthYear(month: number, year: number): string {
  const mName = MONTH_NAMES[(month - 1 + 12) % 12] || 'JÚL';
  return `${mName} / ${year}`;
}

export function extractYearAndMonth(dateStr: string): { year: number; month: number } | null {
  if (!dateStr) return null;
  const str = dateStr.trim();
  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length >= 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      if (!isNaN(year) && !isNaN(month)) return { year, month };
    }
  }
  if (str.includes('.')) {
    const parts = str.split('.').map((p) => p.trim());
    if (parts.length >= 3) {
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month)) return { year, month };
    }
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }
  return null;
}

