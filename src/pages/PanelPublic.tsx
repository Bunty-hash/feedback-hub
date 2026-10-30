import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isConfigured } from '../lib/supabase';
import { fmtDate } from '../lib/format';
import { voterId } from '../lib/voter';
import { Icon } from '../components/Icon';

interface Q {
  id: string; event_name: string; event_date: string; host_name: string | null; question: string;
  status: 'accepted' | 'answered'; reply: string | null; votes: number; voted: boolean; created_at: string;
}

export default function PanelPublic() {
  const [items, setItems] = useState<Q[]>([]);
  const [event, setEvent] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    if (!isConfigured) { setLoading(false); return; }
    const { data, error: err } = await supabase.rpc('panel_public_questions', { p_voter: voterId() });
    if (err) setError('Could not load the questions. Please try again shortly.');
    else setItems(((data ?? []) as Q[]).map((q) => ({ ...q, votes: Number(q.votes) })));
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const events = useMemo(() => Array.from(new Set(items.map((q) => q.event_name))), [items]);
  const shown = items
    .filter((q) => event === 'all' || q.event_name === event)
    .sort((a, b) => b.votes - a.votes || b.created_at.localeCompare(a.created_at));

  async function toggle(q: Q) {
    setBusy(q.id);
    setError('');
    const { data, error: err } = await supabase.rpc('panel_vote', { p_feedback: q.id, p_voter: voterId(), p_on: !q.voted });
    if (err) setError('Your vote could not be saved. Please try again.');
    else setItems((all) => all.map((x) => (x.id === q.id ? { ...x, voted: !q.voted, votes: Number(data) } : x)));
    setBusy('');
  }

  return (
    <div className="dash">
      <section className="hero">
        <p className="kicker">Panel</p>
        <h1>Panel questions</h1>
        <p className="muted lead">Upvote the questions you would like the panel to answer. The most popular come first. Questions appear here once they have been accepted by the organisers.</p>
      </section>

      {items.length > 1 && events.length > 1 && (
        <div className="field qa-filter">
          <label htmlFor="ev">Presentation</label>
          <select id="ev" value={event} onChange={(e) => setEvent(e.target.value)}>
            <option value="all">All presentations</option>
            {events.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      )}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {loading ? <p className="muted center">Loading…</p> : shown.length === 0 ? (
        <div className="center">
          <p className="muted">No questions are open for voting yet.</p>
          <Link to="/feedback/presentation" className="btn btn-primary"><Icon name="message" /> Ask a question</Link>
        </div>
      ) : (
        <ul className="qa-list">
          {shown.map((q) => (
            <li key={q.id} className={`qa-card pub${q.status === 'answered' ? ' st-answered' : ''}`}>
              <button type="button" className={`vote${q.voted ? ' on' : ''}`} onClick={() => void toggle(q)} disabled={busy === q.id}
                aria-pressed={q.voted} aria-label={`${q.voted ? 'Remove your upvote from' : 'Upvote'} this question. ${q.votes} votes.`}>
                <Icon name="up" size={22} />
                <span className="vote-n">{q.votes}</span>
              </button>
              <div className="qa-body">
                <div className="qa-meta">
                  {q.status === 'answered' && <span className="qa-badge st-answered">answered</span>}
                  <span>{q.event_name}</span>
                  {q.host_name && <span>Speaker: {q.host_name}</span>}
                  <span>{fmtDate(q.event_date)}</span>
                </div>
                <p className="qa-question">“{q.question}”</p>
                {q.reply && (
                  <div className="qa-reply"><span className="qa-reply-label"><Icon name="reply" /> Panel reply</span><p>{q.reply}</p></div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="muted small center">Votes are anonymous. Your browser remembers which questions you have voted for.</p>
    </div>
  );
}
