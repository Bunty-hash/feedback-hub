import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { Icon } from '../components/Icon';
import AdminNav from '../components/AdminNav';

interface Channel { id: string; code: string; title: string; kind: string; speaker: string | null; status: 'open' | 'closed'; created_at: string }
interface Reply { id: string; question_id: string; body: string; author_name: string | null; is_host: boolean; hidden: boolean }
interface Question { id: string; channel_id: string; body: string; author_name: string | null; hidden: boolean; accepted: boolean; created_at: string }
const ACK = 'Thank you. We have received your question and it will be addressed.';
const KINDS = ['Presentation', 'Product launch', 'Training', 'Masterclass', 'Exhibition', 'Other'];

export default function PanelAdmin() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState(KINDS[0]);
  const [speaker, setSpeaker] = useState('');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const loadChannels = useCallback(async () => {
    const { data, error: err } = await supabase.from('channels').select('*').order('created_at', { ascending: false });
    if (err) setError('Could not load channels.'); else setChannels((data ?? []) as Channel[]);
  }, []);
  const loadChannel = useCallback(async (id: string) => {
    const { data: qs } = await supabase.from('channel_questions').select('*').eq('channel_id', id).order('created_at', { ascending: false });
    const ids = ((qs ?? []) as Question[]).map((q) => q.id);
    setQuestions((qs ?? []) as Question[]);
    if (ids.length === 0) { setReplies([]); setVotes({}); return; }
    const [{ data: rs }, { data: vs }] = await Promise.all([
      supabase.from('channel_replies').select('*').in('question_id', ids).order('created_at'),
      supabase.from('channel_votes').select('question_id').in('question_id', ids).limit(20000),
    ]);
    setReplies((rs ?? []) as Reply[]);
    const vc: Record<string, number> = {};
    for (const v of (vs ?? []) as { question_id: string }[]) vc[v.question_id] = (vc[v.question_id] ?? 0) + 1;
    setVotes(vc);
  }, []);

  useEffect(() => { void loadChannels(); }, [loadChannels]);
  useEffect(() => {
    if (!sel) return;
    void loadChannel(sel);
    const t = setInterval(() => void loadChannel(sel), 5000);
    return () => clearInterval(t);
  }, [sel, loadChannel]);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy('create'); setError('');
    for (let i = 0; i < 5; i++) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const { data, error: err } = await supabase.from('channels').insert({ code, title: title.trim(), kind, speaker: speaker.trim() || null }).select().single();
      if (!err && data) { setTitle(''); setSpeaker(''); await loadChannels(); setSel((data as Channel).id); break; }
      if (err && err.code !== '23505') { setError('Could not create the channel.'); break; }
    }
    setBusy('');
  }
  async function setStatus(c: Channel, status: 'open' | 'closed') {
    await supabase.from('channels').update({ status }).eq('id', c.id);
    await loadChannels();
  }
  async function hideQ(q: Question) { await supabase.from('channel_questions').update({ hidden: !q.hidden }).eq('id', q.id); if (sel) await loadChannel(sel); }
  async function hideR(r: Reply) { await supabase.from('channel_replies').update({ hidden: !r.hidden }).eq('id', r.id); if (sel) await loadChannel(sel); }
  async function hostReply(q: Question) {
    const body = (draft[q.id] ?? '').trim();
    if (!body) return;
    setBusy(q.id);
    const { error: err } = await supabase.from('channel_replies').insert({ question_id: q.id, body, is_host: true, author_name: 'Host' });
    if (err) setError('Could not send the reply.'); else { setDraft((d) => ({ ...d, [q.id]: '' })); if (sel) await loadChannel(sel); }
    setBusy('');
  }
  async function accept(q: Question) {
    setBusy(q.id); setError('');
    const { error: e1 } = await supabase.from('channel_replies').insert({ question_id: q.id, body: ACK, is_host: true, author_name: 'Host' });
    const { error: e2 } = e1 ? { error: e1 } : await supabase.from('channel_questions').update({ accepted: true }).eq('id', q.id);
    if (e2) setError('Could not accept the question.'); else if (sel) await loadChannel(sel);
    setBusy('');
  }
  async function removeChannel(c: Channel) {
    if (!window.confirm(`Delete "${c.title}" and all its questions and replies? This cannot be undone.`)) return;
    const { error: err } = await supabase.from('channels').delete().eq('id', c.id);
    if (err) setError('Could not delete the channel.'); else { if (sel === c.id) setSel(null); await loadChannels(); }
  }
  const link = (c: Channel) => `${window.location.origin}/panel/${c.code}`;
  const current = channels.find((c) => c.id === sel) ?? null;
  const pending = questions.filter((q) => !q.accepted);
  const acceptedCount = questions.length - pending.length;
  const sorted = [...pending].sort((a, b) => (votes[b.id] ?? 0) - (votes[a.id] ?? 0));

  return (
    <div className="dash">
      <div className="dash-head">
        <div><p className="kicker">Administrator</p><h1>Panel channels</h1>
          <p className="muted">Create a channel for a presentation, share its PIN, and manage questions as they arrive.</p></div>
        <div className="actions"><button type="button" className="btn btn-ghost" onClick={() => supabase.auth.signOut()}><Icon name="logout" /> Sign out</button></div>
      </div>
      <AdminNav />
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <form className="panel filters" onSubmit={create}>
        <div className="field grow"><label htmlFor="t">Presentation title</label><input id="t" type="text" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. grandMA3 v2.4 launch" /></div>
        <div className="field"><label htmlFor="k">Type</label><select id="k" value={kind} onChange={(e) => setKind(e.target.value)}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select></div>
        <div className="field"><label htmlFor="s">Speaker (optional)</label><input id="s" type="text" maxLength={100} value={speaker} onChange={(e) => setSpeaker(e.target.value)} /></div>
        <button type="submit" className="btn btn-primary" disabled={busy === 'create' || !title.trim()}><Icon name="plus" /> Create channel</button>
      </form>

      <ul className="chan-list">
        {channels.length === 0 && <li className="muted">No channels yet.</li>}
        {channels.map((c) => (
          <li key={c.id} className={`chan${sel === c.id ? ' on' : ''}`}>
            <button type="button" className="chan-main" onClick={() => setSel(sel === c.id ? null : c.id)}>
              <span className="pin-badge small"><span>PIN</span>{c.code}</span>
              <span><strong>{c.title}</strong><br /><small className="muted">{c.kind}{c.speaker ? ` · ${c.speaker}` : ''}</small></span>
              <span className={`qa-badge st-${c.status === 'open' ? 'answered' : 'declined'}`}>{c.status}</span>
            </button>
            <div className="actions">
              <button type="button" className="btn btn-small" onClick={() => void navigator.clipboard?.writeText(link(c))}><Icon name="copy" /> Copy link</button>
              <button type="button" className="btn btn-small" onClick={() => void removeChannel(c)}><Icon name="x" /> Delete</button>
              <button type="button" className="btn btn-small" onClick={() => void setStatus(c, c.status === 'open' ? 'closed' : 'open')}>{c.status === 'open' ? 'Close' : 'Reopen'}</button>
            </div>
          </li>
        ))}
      </ul>

      {current && (
        <section className="panel">
          <h2>{current.title}: new questions ({pending.length}){acceptedCount > 0 && <small className="muted"> · {acceptedCount} accepted</small>}</h2>
          {sorted.length === 0 ? <p className="muted">No new questions. Accepted questions leave this list.</p> : (
            <ul className="qa-list">
              {sorted.map((q) => (
                <li key={q.id} className={`qa-card${q.hidden ? ' st-declined' : ''}`}>
                  <div className="qa-meta">{q.hidden && <span className="qa-badge st-declined">hidden</span>}<span>{q.author_name || 'Anonymous'}</span><span className="qa-votes"><Icon name="up" /> {votes[q.id] ?? 0} upvotes</span></div>
                  <p className="qa-question">{q.body}</p>
                  <ul className="replies">
                    {replies.filter((r) => r.question_id === q.id).map((r) => (
                      <li key={r.id} className={r.is_host ? 'host' : ''}>
                        <span className="reply-who">{r.is_host ? 'Host' : r.author_name || 'Anonymous'}{r.hidden && ' (hidden)'}</span>
                        <p>{r.body}</p>
                        <button type="button" className="btn btn-ghost btn-small" onClick={() => void hideR(r)}><Icon name={r.hidden ? 'eye' : 'eyeOff'} /> {r.hidden ? 'Show' : 'Hide'}</button>
                      </li>
                    ))}
                  </ul>
                  <div className="field"><label htmlFor={`h-${q.id}`}>Host reply</label>
                    <textarea id={`h-${q.id}`} rows={2} maxLength={1000} value={draft[q.id] ?? ''} onChange={(e) => setDraft((d) => ({ ...d, [q.id]: e.target.value }))} placeholder="Answer for everyone in the channel…" /></div>
                  <div className="actions">
                    <button type="button" className="btn btn-primary" disabled={busy === q.id} onClick={() => void accept(q)}><Icon name="check" /> Accept</button>
                    <button type="button" className="btn" disabled={busy === q.id || !(draft[q.id] ?? '').trim()} onClick={() => void hostReply(q)}><Icon name="reply" /> Send reply</button>
                    <button type="button" className="btn btn-ghost" onClick={() => void hideQ(q)}><Icon name={q.hidden ? 'eye' : 'eyeOff'} /> {q.hidden ? 'Show question' : 'Hide question'}</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
