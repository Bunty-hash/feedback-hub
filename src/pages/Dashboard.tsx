import { Icon } from '../components/Icon';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CATEGORIES, CATEGORY_BY_SLUG, type CategorySlug } from '../lib/categories';
import type { FeedbackRow, Sentiment } from '../lib/types';
import { fmtDate, fmtDateTime, localIsoDate } from '../lib/format';
import { downloadCsv } from '../lib/csv';
import { Stars } from '../components/StarRating';
import { DailyBars, Donut, HBars, type BarItem } from '../components/Charts';

const PAGE_SIZE = 15;
const SENTIMENTS: Sentiment[] = ['positive', 'neutral', 'negative'];

async function fetchAll(): Promise<FeedbackRow[]> {
  const size = 1000;
  const all: FeedbackRow[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id')
      .range(from, from + size - 1);
    if (error) throw error;
    all.push(...((data ?? []) as FeedbackRow[]));
    if (!data || data.length < size) break;
  }
  return all;
}

const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null);
const fmtAvg = (n: number | null) => (n === null ? '–' : n.toFixed(2));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function Dashboard() {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState<'all' | CategorySlug>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<FeedbackRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await fetchAll());
    } catch {
      setError('Could not load feedback. Please refresh, or sign in again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(0); }, [category, from, to, query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (category !== 'all' && r.category !== category) return false;
      const day = localIsoDate(new Date(r.created_at));
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (!q) return true;
      const hay = [r.participant_name, r.event_name, r.host_name, ...Object.values(r.comments ?? {})]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [rows, category, from, to, query]);

  const stats = useMemo(() => {
    const sentiment = { positive: 0, neutral: 0, negative: 0 } as Record<Sentiment, number>;
    for (const r of filtered) sentiment[r.sentiment] += 1;
    return { total: filtered.length, average: avg(filtered.map((r) => r.overall_rating)), sentiment };
  }, [filtered]);

  const charts = useMemo(() => {
    const dist = [5, 4, 3, 2, 1].map((n) => ({ n, count: filtered.filter((r) => r.overall_rating === n).length }));

    const perDay = new Map<string, number>();
    for (const r of filtered) {
      const d = localIsoDate(new Date(r.created_at));
      perDay.set(d, (perDay.get(d) ?? 0) + 1);
    }
    const now = new Date();
    const days = Array.from({ length: 30 }, (_, i) => {
      const k = localIsoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (29 - i)));
      return { date: k, count: perDay.get(k) ?? 0 };
    });

    const byCategory: BarItem[] = CATEGORIES.map((c) => {
      const list = filtered.filter((r) => r.category === c.slug);
      const a = avg(list.map((r) => r.overall_rating));
      return { label: c.title, value: a, display: fmtAvg(a), note: `${list.length} response${list.length === 1 ? '' : 's'}` };
    });

    const cat = category === 'all' ? null : CATEGORY_BY_SLUG[category];
    const questions: BarItem[] | null = cat
      ? cat.fields.filter((f) => f.type === 'rating').map((f) => {
          const vals = filtered
            .map((r) => (f.role === 'overall' ? r.overall_rating : r.ratings?.[f.key]))
            .filter((v): v is number => typeof v === 'number');
          const a = avg(vals);
          return { label: f.label, value: a, display: fmtAvg(a), note: `${vals.length} responses` };
        })
      : null;

    return { dist, days, byCategory, questions };
  }, [filtered, category]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const filtersOn = category !== 'all' || from || to || query.trim();
  const distMax = Math.max(1, ...charts.dist.map((d) => d.count));

  return (
    <div className="dash">
      <div className="dash-head">
        <div>
          <p className="kicker">Administrator</p>
          <h1>Feedback dashboard</h1>
          <p className="muted">{filtersOn ? 'Figures reflect the current filters.' : 'Showing all feedback.'}</p>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={() => void load()} disabled={loading}><Icon name="refresh" /> Refresh</button>
          <button type="button" className="btn btn-primary" onClick={() => downloadCsv(filtered)} disabled={filtered.length === 0}>
            <Icon name="download" /> Export CSV ({filtered.length})
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => supabase.auth.signOut()}><Icon name="logout" /> Sign out</button>
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <section className="panel filters" aria-label="Filters">
        <div className="field">
          <label htmlFor="flt-cat">Category</label>
          <select id="flt-cat" value={category} onChange={(e) => setCategory(e.target.value as 'all' | CategorySlug)}>
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.title}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="flt-from">Submitted from</label>
          <input id="flt-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="flt-to">Submitted to</label>
          <input id="flt-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="field grow">
          <label htmlFor="flt-q">Search</label>
          <input id="flt-q" type="search" placeholder="Name, event, trainer or comment" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {filtersOn && (
          <button type="button" className="btn btn-ghost" onClick={() => { setCategory('all'); setFrom(''); setTo(''); setQuery(''); }}><Icon name="x" /> Clear</button>
        )}
      </section>

      <section className="stats" aria-label="Summary">
        <div className="stat"><span className="stat-label"><Icon name="users" /> Total submissions</span><span className="stat-value">{stats.total}</span></div>
        <div className="stat"><span className="stat-label"><Icon name="star" /> Average satisfaction</span><span className="stat-value">{fmtAvg(stats.average)}<small> / 5</small></span></div>
        {SENTIMENTS.map((s) => (
          <div className={`stat sent-${s}`} key={s}>
            <span className="stat-label"><Icon name={s === 'positive' ? 'smile' : s === 'neutral' ? 'meh' : 'frown'} /> {cap(s)}</span>
            <span className="stat-value">{stats.sentiment[s]}</span>
            <span className="stat-sub">{stats.total ? Math.round((stats.sentiment[s] / stats.total) * 100) : 0}%</span>
          </div>
        ))}
      </section>
      <p className="muted small">Positive = overall rating 4–5, neutral = 3, negative = 1–2.</p>

      <section className="charts" aria-label="Analytics">
        <div className="panel wide">
          <h2>Responses, last 30 days</h2>
          <DailyBars data={charts.days} />
        </div>
        <div className="panel">
          <h2>Sentiment</h2>
          <Donut
            total={stats.total}
            segments={SENTIMENTS.map((s) => ({ label: cap(s), value: stats.sentiment[s], tone: s }))}
          />
        </div>
        <div className="panel">
          <h2>Overall rating distribution</h2>
          <HBars
            max={distMax}
            items={charts.dist.map((d) => ({
              label: `${d.n} star${d.n > 1 ? 's' : ''}`,
              value: d.count,
              display: String(d.count),
              note: stats.total ? `${Math.round((d.count / stats.total) * 100)}%` : '0%',
            }))}
          />
        </div>
        <div className="panel">
          <h2>Average rating by category</h2>
          <HBars items={charts.byCategory} max={5} />
        </div>
        <div className="panel">
          <h2>Question breakdown</h2>
          {charts.questions ? (
            <HBars items={charts.questions} max={5} />
          ) : (
            <p className="muted">Choose a category in the filters to see the average score for each question.</p>
          )}
        </div>
      </section>

      <section className="panel" aria-label="Submissions">
        <h2>Recent submissions</h2>
        {loading ? (
          <p className="muted center">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="muted center">No feedback found.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Submitted</th><th>Category</th><th>Event / topic</th><th>Host</th><th>Rating</th><th>Sentiment</th><th /></tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id}>
                    <td>{fmtDateTime(r.created_at)}</td>
                    <td>{CATEGORY_BY_SLUG[r.category]?.title ?? r.category}</td>
                    <td>{r.event_name}</td>
                    <td>{r.host_name || '–'}</td>
                    <td><Stars value={r.overall_rating} /></td>
                    <td><span className={`pill sent-${r.sentiment}`}>{r.sentiment}</span></td>
                    <td><button type="button" className="btn btn-small" onClick={() => setSelected(r)}><Icon name="eye" /> View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > PAGE_SIZE && (
          <div className="pager">
            <button type="button" className="btn btn-small" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><Icon name="prev" /> Previous</button>
            <span>Page {page + 1} of {pages}</span>
            <button type="button" className="btn btn-small" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>Next <Icon name="next" /></button>
          </div>
        )}
      </section>

      {selected && <Detail row={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Detail({ row, onClose }: { row: FeedbackRow; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const cat = CATEGORY_BY_SLUG[row.category];
  const ratingFields = cat?.fields.filter((f) => f.type === 'rating') ?? [];
  const commentFields = cat?.fields.filter((f) => f.type === 'textarea') ?? [];

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Feedback details" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>{cat?.title ?? row.category}</h2>
            <p className="muted small">Submitted {fmtDateTime(row.created_at)}</p>
          </div>
          <button type="button" className="btn btn-small" onClick={onClose} aria-label="Close"><Icon name="x" /> Close</button>
        </div>
        <dl className="details">
          <dt>Participant</dt><dd>{row.participant_name || 'Anonymous'}</dd>
          <dt>{cat?.fields.find((f) => f.role === 'event_name')?.label ?? 'Event'}</dt><dd>{row.event_name}</dd>
          <dt>{cat?.fields.find((f) => f.role === 'event_date')?.label ?? 'Date'}</dt><dd>{fmtDate(row.event_date)}</dd>
          {cat?.fields.some((f) => f.role === 'host_name') && (
            <><dt>{cat.fields.find((f) => f.role === 'host_name')?.label}</dt><dd>{row.host_name || '–'}</dd></>
          )}
          <dt>Sentiment</dt><dd><span className={`pill sent-${row.sentiment}`}>{row.sentiment}</span></dd>
        </dl>
        <h3>Ratings</h3>
        <dl className="details">
          {ratingFields.map((f) => {
            const v = f.role === 'overall' ? row.overall_rating : row.ratings?.[f.key];
            return (
              <Fragment key={f.key}><dt>{f.label}</dt><dd>{typeof v === 'number' ? <><Stars value={v} /> {v}/5</> : '–'}</dd></Fragment>
            );
          })}
        </dl>
        <h3>Comments</h3>
        <dl className="details">
          {commentFields.map((f) => (
            <Fragment key={f.key}><dt>{f.label}</dt><dd className="prewrap">{row.comments?.[f.key] || '–'}</dd></Fragment>
          ))}
        </dl>
      </div>
    </div>
  );
}
