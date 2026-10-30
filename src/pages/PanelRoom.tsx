import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { voterId } from '../lib/voter';
import { Icon } from '../components/Icon';

interface Channel { id: string; code: string; title: string; kind: string; speaker: string | null; status: 'open' | 'closed' }
interface Reply { id: string; body: string; author_name: string | null; is_host: boolean; created_at: string }
interface Q { mine: boolean; id: string; body: string; author_name: string | null; votes: number; voted: boolean; created_at: string; replies: Reply[] }
const SHAPES = ['tri', 'dia', 'cir', 'sqr'];

function getName() { try { return localStorage.getItem('fh_name') ?? ''; } catch { return ''; } }
function saveName(n: string) { try { localStorage.setItem('fh_name', n); } catch { /* ignore */ } }

export default function PanelRoom() {
  const { code = '' } = useParams();
  const [ch, setCh] = useState<Channel | null | undefined>(undefined);
  const [qs, setQs] = useState<Q[]>([]);
  const [text, setText] = useState('');
  const [name, setName] = useState(getName());
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [c, l] = await Promise.all([
      supabase.rpc('channel_join', { p_code: code }),
      supabase.rpc('channel_questions_list', { p_code: code, p_voter: voterId() }),
    ]);
    if (c.error) return;
    const first = (c.data as Channel[] | null)?.[0] ?? null;
    setCh(first);
    if (!l.error) setQs(((l.data ?? []) as Q[]).map((q) => ({ ...q, votes: Number(q.votes) })));
  }, [code]);

  useEffect(() => { void load(); const t = setInterval(() => void load(), 5000); return () => clearInterval(t); }, [load]);

  async function ask(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy('ask'); setError('');
    saveName(name);
    const { error: err } = await supabase.rpc('channel_ask', { p_code: code, p_body: text.trim(), p_name: name, p_voter: voterId(), p_email: email.trim() || null });
    if (err) setError('Your question could not be sent. The panel may be closed.');
    else { setText(''); setEmail(''); await load(); }
    setBusy('');
  }
  async function vote(q: Q) {
    setBusy(q.id); setError('');
    const { data, error: err } = await supabase.rpc('channel_vote', { p_code: code, p_question: q.id, p_voter: voterId(), p_on: !q.voted });
    if (err) setError('Your vote could not be saved.');
    else setQs((all) => all.map((x) => (x.id === q.id ? { ...x, voted: !q.voted, votes: Number(data) } : x)).sort((a, b) => b.votes - a.votes));
    setBusy('');
  }
  if (ch === undefined) return <p className="muted center">Loading…</p>;
  if (ch === null) return (
    <div className="center"><h1>Panel not found</h1><p className="muted">Check the PIN and try again.</p><Link to="/panel" className="btn btn-primary">Enter a PIN</Link></div>
  );
  const closed = ch.status === 'closed';

  return (
    <div className="room">
      <div className="room-head">
        <div>
          <p className="kicker"><span className="live-dot" /> {closed ? 'Closed' : 'Live'} · {ch.kind}</p>
          <h1>{ch.title}</h1>
          {ch.speaker && <p className="muted">Speaker: {ch.speaker}</p>}
        </div>
        <div className="pin-badge" aria-label={`PIN ${ch.code}`}><span>PIN</span>{ch.code}</div>
      </div>

      {!closed && (
        <form className="ask" onSubmit={ask}>
          <label htmlFor="q" className="sr">Your question</label>
          <textarea id="q" rows={2} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your question for the panel…" />
          <div className="ask-row">
            <input type="text" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)" aria-label="Your name (optional)" />
            <input type="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional, for a private reply)" aria-label="Email (optional, for a private reply)" />
            <button type="submit" className="btn btn-primary" disabled={busy === 'ask' || !text.trim()}><Icon name="send" /> Send question</button>
          </div>
          <p className="muted small">Sensitive question? Add your email and the host can answer you privately. Your email is seen only by the host of this panel and is never shown to other participants.</p>
        </form>
      )}
      {closed && <div className="alert alert-error">This panel is closed. You can still read the questions and answers.</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {qs.length === 0 ? <p className="muted center">No questions yet. Be the first to ask.</p> : (
        <ul className="qa-list">
          {qs.map((q, i) => (
            <li key={q.id} className={`qa-card pub shape-${SHAPES[i % 4]}`}>
              <button type="button" className={`vote${q.voted ? ' on' : ''}`} onClick={() => void vote(q)} disabled={busy === q.id || closed}
                aria-pressed={q.voted} aria-label={`${q.voted ? 'Remove your upvote from' : 'Upvote'} this question. ${q.votes} votes.`}>
                <Icon name="up" size={22} /><span className="vote-n">{q.votes}</span>
              </button>
              <div className="qa-body">
                <div className="qa-meta"><span>{q.author_name || 'Anonymous'}</span>{q.mine && <span className="qa-badge st-answered">your question</span>}</div>
                <p className="qa-question">{q.body}</p>
                {q.mine && q.replies.length > 0 && (
                  <ul className="replies">
                    {q.replies.map((r) => (
                      <li key={r.id} className={r.is_host ? 'host' : ''}>
                        <span className="reply-who">{r.is_host ? <><Icon name="check" /> Host</> : r.author_name || 'Anonymous'}</span>
                        <p>{r.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
                {q.mine && q.replies.length === 0 && <p className="muted small">Your question has been sent. The host will reply to you here.</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="muted small center">Anyone in the panel can upvote questions. Host replies are private and only shown to the person who asked.</p>
    </div>
  );
}
