import { fmtDate } from '../lib/format';

export interface BarItem {
  label: string;
  value: number | null;
  display: string;
  note?: string;
}

/** Horizontal bar list. Values are always printed as text as well, so the chart never relies on colour alone. */
export function HBars({ items, max }: { items: BarItem[]; max: number }) {
  return (
    <ul className="hbars">
      {items.map((it) => (
        <li key={it.label}>
          <div className="hbar-top">
            <span>{it.label}</span>
            <span className="hbar-val">
              {it.display}
              {it.note && <small> {it.note}</small>}
            </span>
          </div>
          <div className="hbar-track">
            <div className="hbar-fill" style={{ width: `${it.value && max > 0 ? Math.min(100, (it.value / max) * 100) : 0}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export interface Segment {
  label: string;
  value: number;
  tone: 'positive' | 'neutral' | 'negative';
}

export function Donut({ segments, total }: { segments: Segment[]; total: number }) {
  let offset = 25; // start at 12 o'clock
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 42 42" className="donut" role="img"
        aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(', ')}>
        <circle className="donut-ring" cx="21" cy="21" r="15.9155" fill="none" strokeWidth="6" />
        {total > 0 &&
          segments.map((s) => {
            const pct = (s.value / total) * 100;
            const el = (
              <circle key={s.label} className={`seg seg-${s.tone}`} cx="21" cy="21" r="15.9155" fill="none"
                strokeWidth="6" strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset={offset} />
            );
            offset -= pct;
            return el;
          })}
        <text x="21" y="22.2" textAnchor="middle" className="donut-num">{total}</text>
        <text x="21" y="27" textAnchor="middle" className="donut-cap">responses</text>
      </svg>
      <ul className="legend">
        {segments.map((s) => (
          <li key={s.label}>
            <span className={`dot dot-${s.tone}`} aria-hidden="true" />
            {s.label}
            <strong>{s.value}</strong>
            <small>{total ? Math.round((s.value / total) * 100) : 0}%</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DailyBars({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const W = 300;
  const H = 100;
  const bw = W / data.length;
  const sum = data.reduce((a, d) => a + d.count, 0);
  const peak = Math.max(...data.map((d) => d.count));
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="daily" role="img"
        aria-label={`${sum} responses over the last ${data.length} days, up to ${peak} in a single day`}>
        {data.map((d, i) => {
          const h = (d.count / max) * H;
          return (
            <rect key={d.date} x={i * bw + 1} y={H - h} width={bw - 2} height={d.count ? Math.max(h, 3) : 0} className="daily-bar">
              <title>{`${fmtDate(d.date)}: ${d.count}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="axis-labels">
        <span>{fmtDate(data[0].date)}</span>
        <span>Peak: {peak} in a day</span>
        <span>{fmtDate(data[data.length - 1].date)}</span>
      </div>
    </div>
  );
}
