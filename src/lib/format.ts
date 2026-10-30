const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');

function parse(iso: string): Date {
  // Date-only strings (YYYY-MM-DD) are read as local dates to avoid off-by-one shifts.
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
}

/** e.g. 8 Oct 2026 */
export function fmtDate(iso: string): string {
  const d = parse(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** e.g. 8 Oct 2026, 14:05 */
export function fmtDateTime(iso: string): string {
  const d = parse(iso);
  return `${fmtDate(iso)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** YYYY-MM-DD in the browser's local time zone. */
export function localIsoDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
