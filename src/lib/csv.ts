import type { FeedbackRow } from './types';
import { CATEGORY_BY_SLUG } from './categories';
import { fmtDate, localIsoDate } from './format';

function humanise(key: string): string {
  const s = key.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  if (typeof value === 'number') return String(value);
  let s = String(value).replace(/\r?\n/g, ' ');
  // Neutralise spreadsheet formulas (CSV injection).
  if (/^[=+\-@\t]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(rows: FeedbackRow[]): string {
  const extraKeys: string[] = [];
  for (const r of rows) {
    for (const k of [...Object.keys(r.ratings ?? {}), ...Object.keys(r.comments ?? {})]) {
      if (!extraKeys.includes(k)) extraKeys.push(k);
    }
  }
  const header = [
    'Submitted', 'Category', 'Participant name', 'Event / topic', 'Event date',
    'Trainer / instructor / speaker', 'Overall rating', 'Sentiment',
    ...extraKeys.map(humanise),
  ];
  const lines = [header.map(cell).join(',')];
  for (const r of rows) {
    const values: unknown[] = [
      r.created_at,
      CATEGORY_BY_SLUG[r.category]?.title ?? r.category,
      r.participant_name ?? '',
      r.event_name,
      fmtDate(r.event_date),
      r.host_name ?? '',
      r.overall_rating,
      r.sentiment,
      ...extraKeys.map((k) => r.ratings?.[k] ?? r.comments?.[k] ?? ''),
    ];
    lines.push(values.map(cell).join(','));
  }
  return lines.join('\r\n');
}

export function downloadCsv(rows: FeedbackRow[]): void {
  const blob = new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `feedback-export-${localIsoDate()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
