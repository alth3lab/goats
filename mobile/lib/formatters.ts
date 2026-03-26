/**
 * Formatters that guarantee Western/Latin numerals (0-9) in Arabic UI.
 * On Arabic-locale devices, toLocaleString()/toLocaleDateString('ar-SA')
 * produce Eastern-Arabic numerals (٠١٢٣٤٥٦٧٨٩) which we want to avoid.
 */

const dateFormatter = new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const dateShortMonthFormatter = new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
  month: 'short',
});

const timeFormatter = new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
  hour: '2-digit',
  minute: '2-digit',
});

/** Format date → "25/03/2026" (Arabic month names, Latin digits) */
export function formatDate(date: string | Date): string {
  return dateFormatter.format(new Date(date));
}

/** Format date → short month name with Latin digits */
export function formatDateShortMonth(date: string | Date): string {
  return dateShortMonthFormatter.format(new Date(date));
}

/** Format time → "02:30 م" (Latin digits) */
export function formatTime(date: string | Date): string {
  return timeFormatter.format(new Date(date));
}

/** Format number with commas → "1,234" (always Latin digits) */
export function formatNumber(value: number | null | undefined): string {
  if (value == null) return '0';
  return value.toLocaleString('en-US');
}

/** Format currency → "1,234" (always Latin digits, no symbol) */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '0';
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString('en-US');
}

/** Ensure a number/string always uses Western digits */
export function western(value: number | string | null | undefined): string {
  if (value == null) return '0';
  return String(value).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}
