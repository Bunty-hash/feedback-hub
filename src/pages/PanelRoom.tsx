import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { voterId } from '../lib/voter';
import { Icon } from '../components/Icon';
import { useT } from '../i18n';

interface Channel { id: string; code: string; title: string; kind: string; speaker: string | null; status: 'open' | 'closed' }
interface Reply { id: string; body: string; author_name: string | null; is_host: boolean; created_at: string }
interface Q { mine: boolean; id: string; body: string; author_name: string | null; votes: number; voted: boolean; created_at: string; replies: Reply[] }
const SHAPES = ['tri', 'dia', 'cir', 'sqr'];

function getName() { try { return localStorage.getItem('fh_name') ?? ''; } catch { return ''; } }
function saveName(n: string) { try { localStorage.setItem('fh_name', n); } catch { /* ignore */ } }

export default function PanelRoom() {
  const t = useT();
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
    if (err) setError(t('room.errAsk'));
    else { setText(''); setEmail(''); await load(); }
    setBusy('');
  }
  async function vote(q: Q) {
    setBusy(q.id); setError('');
    const { data, error: err } = await supabase.rpc('channel_vote', { p_code: code, p_question: q.id, p_voter: voterId(), p_on: !q.voted });
    if (err) setError(t('room.errVote'));
    else setQs((all) => all.map((x) => (x.id === q.id ? { ...x, voted: !q.voted, votes: Number(data) } : x)).sort((a, b) => b.votes - a.votes));
    setBusy('');
  }
  if (ch === undefined) return <p className="muted center">{t('room.loading')}</p>;
  if (ch === null) return (
    <div className="center"><h1>{t('room.notFound')}</h1><p className="muted">{t('room.notFoundHint')}</p><Link to="/panel" className="btn btn-primary">{t('room.enterPin')}</Link></div>
  );
  const closed = ch.status === 'closed';

  return (
    <div className="room">
      <div className="room-head">
        <div>
          <p className="kicker"><span className="live-dot" /> {closed ? t('room.closedTag') : t('room.live')} · {ch.kind}</p>
          <h1>{ch.title}</h1>
          {ch.speaker && <p className="muted">{t('room.speaker', { name: ch.speaker })}</p>}
        </div>
        <div className="pin-badge" aria-label={t('room.pinAria', { code: ch.code })}><span>PIN</span>{ch.code}</div>
      </div>

      {!closed && (
        <form className="ask" onSubmit={ask}>
          <label htmlFor="q" className="sr">{t('room.yourQuestion')}</label>
          <textarea id="q" rows={2} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} placeholder={t('room.qPlaceholder')} />
          <div className="ask-row">
            <input type="text" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('room.namePlaceholder')} aria-label={t('room.namePlaceholder')} />
            <input type="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('room.emailPlaceholder')} aria-label={t('room.emailPlaceholder')} />
            <button type="submit" className="btn btn-primary" disabled={busy === 'ask' || !text.trim()}><Icon name="send" /> {t('room.send')}</button>
          </div>
          <p className="muted small">{t('room.privacy')}</p>
        </form>
      )}

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {closed ? <div className="alert alert-error">{t('room.closed')}</div> : qs.length === 0 ? <p className="muted center">{t('room.none')}</p> : (
        <ul className="qa-list">
          {qs.map((q, i) => (
            <li key={q.id} className={`qa-card pub shape-${SHAPES[i % 4]}`}>
              <button type="button" className={`vote${q.voted ? ' on' : ''}`} onClick={() => void vote(q)} disabled={busy === q.id || closed}
                aria-pressed={q.voted} aria-label={t(q.voted ? 'room.unvote' : 'room.upvote', { n: q.votes })}>
                <Icon name="up" size={22} /><span className="vote-n">{q.votes}</span>
              </button>
              <div className="qa-body">
                <div className="qa-meta"><span>{q.author_name || t('room.anon')}</span>{q.mine && <span className="qa-badge st-answered">{t('room.mine')}</span>}</div>
                <p className="qa-question">{q.body}</p>
                {q.mine && q.replies.length > 0 && (
                  <ul className="replies">
                    {q.replies.map((r) => (
                      <li key={r.id} className={r.is_host ? 'host' : ''}>
                        <span className="reply-who">{r.is_host ? <><Icon name="check" /> {t('room.host')}</> : r.author_name || t('room.anon')}</span>
                        <p>{r.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
                {q.mine && q.replies.length === 0 && <p className="muted small">{t('room.sent')}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="muted small center">{t('room.footer')}</p>
    </div>
  );
}
