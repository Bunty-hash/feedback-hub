import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { FeedbackRow } from '../lib/types';
import { fmtDate } from '../lib/format';
import { Icon } from '../components/Icon';
import AdminNav from '../components/AdminNav';

type Status = 'new' | 'accepted' | 'answered' | 'declined';
interface PanelRow { feedback_id: string; status: Exclude<Status, 'new'>; reply: string | null; updated_at: string }

const TABS: { key: Status | 'all'; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'answered', label: 'Answered' },
  { key: 'declined', label: 'Declined' },
  { key: 'all', label: 'All' },
];

export default function Panel() {
  const [questions, setQuestions] = useState<FeedbackRow[]>([]);
  const [panel, setPanel] = useState<Record<string, PanelRow>>({});
  const [tab, setTab] = useState<Status | 'all'>('new');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [fb, pq] = await Promise.all([
      supabase.from('feedback').select('*').eq('category', 'presentation').order('created_at', { ascending: false }).limit(1000),
      supabase.from('panel_questions').select('feedback_id,status,reply,updated_at').limit(1000),
    ]);
    if (fb.error || pq.error) {
      setError('Could not load questions. Please refresh, or sign in again.');
    } else {
      const rows = ((fb.data ?? []) as FeedbackRow[]).filter((r) => (r.comments?.questions_concerns ?? '').trim() !== '');
      setQuestions(rows);
      const map: Record<string, PanelRow> = {};
      for (const p of (pq.data ?? []) as PanelRow[]) map[p.feedback_id] = p;
      setPanel(map);
      setDrafts((d) => {
        const next = { ...d };
        for (const p of Object.values(map)) if (next[p.feedback_id] === undefined && p.reply) next[p.feedback_id] = p.reply;
        return next;
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const statusOf = (id: string): Status => panel[id]?.status ?? 'new';
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: questions.length, new: 0, accepted: 0, answered: 0, declined: 0 };
    for (const q of questions) c[statusOf(q.id)]++;
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, panel]);
  const shown = questions.filter((q) => tab === 'all' || statusOf(q.id) === tab);

  async function save(id: string, status: Exclude<Status, 'new'>, reply?: string) {
    setBusy(id);
    setError('');
    const { data: u } = await supabase.auth.getUser();
    const row = { feedback_id: id, status, reply: reply ?? panel[id]?.reply ?? null, replied_by: u.user?.email ?? null, updated_at: new Date().toISOString() };
    const { error: err } = await supabase.from('panel_questions').upsert(row, { onConflict: 'feedback_id' });
    if (err) setError('Could not save. Please try again.');
    else setPanel((p) => ({ ...p, [id]: { feedback_id: id, status, reply: row.reply, updated_at: row.updated_at } }));
    setBusy('');
  }

  return (
    <div className="dash">
      <div className="dash-head">
        <div>
          <p className="kicker">Administrator</p>
          <h1>Panel questions</h1>
          <p className="muted">Questions from the Presentation Questionnaire. Accept them for the panel, reply, or decline.</p>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={() => void load()} disabled={loading}><Icon name="refresh" /> Refresh</button>
          <button type="button" className="btn btn-ghost" onClick={() => supabase.auth.signOut()}><Icon name="logout" /> Sign out</button>
        </div>
      </div>
      <AdminNav />
      <p className="muted small">The form collects no contact details, so replies are saved here for the panel session and are not sent to participants.</p>
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="qa-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={`qa-tab${tab === t.key ? ' on' : ''}`} onClick={() => setTab(t.key)}>
            {t.label} <span className="qa-count">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      {loading ? <p className="muted center">Loading…</p> : shown.length === 0 ? (
        <p className="muted center">{questions.length === 0 ? 'No questions have been submitted yet.' : 'Nothing in this list.'}</p>
      ) : (
        <ul className="qa-list">
          {shown.map((q) => {
            const st = statusOf(q.id);
            const draft = drafts[q.id] ?? '';
            return (
              <li key={q.id} className={`qa-card st-${st}`}>
                <div className="qa-meta">
                  <span className={`qa-badge st-${st}`}>{st}</span>
                  <span>{q.event_name}</span>
                  {q.host_name && <span>Speaker: {q.host_name}</span>}
                  <span>{fmtDate(q.event_date)}</span>
                  <span>{q.participant_name ? `Asked by ${q.participant_name}` : 'Anonymous'}</span>
                </div>
                <p className="qa-question">“{q.comments.questions_concerns}”</p>
                <div className="field">
                  <label htmlFor={`r-${q.id}`}>Reply</label>
                  <textarea id={`r-${q.id}`} rows={3} maxLength={4000} value={draft} onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))} placeholder="Write the answer for the panel…" />
                </div>
                <div className="actions">
                  {st !== 'accepted' && st !== 'answered' && (
                    <button type="button" className="btn" disabled={busy === q.id} onClick={() => void save(q.id, 'accepted')}><Icon name="check" /> Accept</button>
                  )}
                  <button type="button" className="btn btn-primary" disabled={busy === q.id || draft.trim() === ''} onClick={() => void save(q.id, 'answered', draft.trim())}>
                    <Icon name="reply" /> {st === 'answered' ? 'Update reply' : 'Send reply'}
                  </button>
                  {st !== 'declined' && (
                    <button type="button" className="btn btn-ghost" disabled={busy === q.id} onClick={() => void save(q.id, 'declined')}><Icon name="x" /> Decline</button>
                  )}
                  {st === 'declined' && (
                    <button type="button" className="btn btn-ghost" disabled={busy === q.id} onClick={() => void save(q.id, 'accepted')}>Restore</button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
