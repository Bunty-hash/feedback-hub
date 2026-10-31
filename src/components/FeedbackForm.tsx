import { Icon } from './Icon';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isConfigured } from '../lib/supabase';
import type { CategoryDef, FieldDef } from '../lib/categories';
import { localIsoDate } from '../lib/format';
import { StarRating } from './StarRating';
import { useT } from '../i18n';
import type { Key } from '../i18n/en';

type Values = Record<string, string | number>;
type Status = 'idle' | 'submitting' | 'done' | 'error';

/** One question per screen: step 0 is the optional name, then each field in turn. */
export default function FeedbackForm({ category }: { category: CategoryDef }) {
  const t = useT();
  const label = (f: FieldDef) => t(`f.${category.slug}.${f.key}` as Key);
  const catTitle = t(`cat.${category.slug}.title` as Key);
  const [values, setValues] = useState<Values>({});
  const [name, setName] = useState('');
  const [trap, setTrap] = useState(''); // honeypot: real people never see or fill this
  const [index, setIndex] = useState(0);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const stepRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const today = useMemo(() => localIsoDate(), []);

  const fields = category.fields;
  const total = fields.length + 1;
  const field: FieldDef | null = index === 0 ? null : fields[index - 1];
  const isLast = index === total - 1;
  const submitting = status === 'submitting';

  useEffect(() => {
    const el = stepRef.current?.querySelector<HTMLElement>('input, textarea, .star');
    el?.focus({ preventScroll: true });
  }, [index]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function setValue(key: string, v: string | number) {
    setValues((p) => ({ ...p, [key]: v }));
    setError('');
  }

  function check(f: FieldDef): string {
    const v = values[f.key];
    if (f.type === 'rating') {
      return f.required && !(typeof v === 'number' && v >= 1 && v <= 5) ? t('form.errRating') : '';
    }
    const s = typeof v === 'string' ? v.trim() : '';
    if (f.required && !s) return t('form.errRequired');
    if (f.type === 'date' && s && s > today) return t('form.errFuture');
    return '';
  }

  async function submit() {
    for (let i = 0; i < fields.length; i++) {
      const e = check(fields[i]);
      if (e) {
        setIndex(i + 1);
        setError(e);
        return;
      }
    }
    if (trap) { // bot: pretend success, store nothing
      setStatus('done');
      return;
    }
    if (!isConfigured) {
      setStatus('error');
      return;
    }

    const str = (f?: FieldDef) => (f ? String(values[f.key] ?? '').trim() : '');
    const byRole = (r: FieldDef['role']) => fields.find((f) => f.role === r);
    const ratings: Record<string, number> = {};
    const comments: Record<string, string> = {};
    for (const f of fields) {
      if (f.role) continue;
      if (f.type === 'rating') ratings[f.key] = Number(values[f.key]);
      else if (f.type === 'textarea' && str(f)) comments[f.key] = str(f);
    }

    setStatus('submitting');
    const { error: err } = await supabase.from('feedback').insert({
      category: category.slug,
      participant_name: name.trim() || null,
      event_name: str(byRole('event_name')),
      event_date: str(byRole('event_date')),
      host_name: str(byRole('host_name')) || null,
      overall_rating: Number(values[byRole('overall')!.key]),
      ratings,
      comments,
    });
    setStatus(err ? 'error' : 'done');
  }

  function next() {
    if (submitting) return;
    window.clearTimeout(timer.current);
    if (field) {
      const e = check(field);
      if (e) {
        setError(e);
        return;
      }
    }
    setError('');
    if (isLast) void submit();
    else setIndex((i) => i + 1);
  }

  function back() {
    window.clearTimeout(timer.current);
    setError('');
    setIndex((i) => Math.max(0, i - 1));
  }

  function pickRating(f: FieldDef, n: number) {
    setValue(f.key, n);
    window.clearTimeout(timer.current);
    if (!isLast) timer.current = window.setTimeout(() => setIndex((i) => Math.min(i + 1, total - 1)), 300);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (e.key === 'Enter') {
      if (target.tagName === 'BUTTON') return; // let buttons behave normally
      if (target.tagName === 'TEXTAREA' && e.shiftKey) return; // new line
      e.preventDefault();
      next();
      return;
    }
    if (field?.type === 'rating' && /^[1-5]$/.test(e.key)) {
      e.preventDefault();
      pickRating(field, Number(e.key));
    }
  }

  function reset() {
    setValues({});
    setName('');
    setTrap('');
    setIndex(0);
    setError('');
    setStatus('idle');
  }

  if (status === 'done') {
    return (
      <div className="confirm" role="status">
        <div className="tick" aria-hidden="true"><Icon name="check" size={40} /></div>
        <h1>{t('form.thanks')}</h1>
        <p className="muted">{t('form.submitted', { title: catTitle })}</p>
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={reset}><Icon name="send" /> {t('form.another')}</button>
          <Link to="/" className="btn"><Icon name="home" /> {t('form.home')}</Link>
        </div>
      </div>
    );
  }

  const title = field ? label(field) : t('form.name');
  const required = field?.required ?? false;

  return (
    <div className="wizard" onKeyDown={onKeyDown}>
      <div
        className="progress"
        role="progressbar"
        aria-label={t('form.progress')}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={index + 1}
      >
        <span style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>

      <p className="wizard-top">
        <Link to="/"><Icon name="arrowLeft" /> {t('form.all')}</Link>
        <span>{catTitle}</span>
      </p>

      <div className="step" ref={stepRef} key={index}>
        <p className="step-num">
          {index + 1}<span> / {total}</span>
        </p>
        <h1 className="q" id="q-title">
          {title}{required ? <span className="req"> *</span> : null}
        </h1>
        {!field && <p className="muted">{t('form.nameHint')}</p>}

        {!field && (
          <input className="big" type="text" maxLength={100} autoComplete="off" aria-labelledby="q-title"
            placeholder={t('form.placeholder')} value={name} onChange={(e) => setName(e.target.value)} />
        )}
        {field?.type === 'text' && (
          <input className="big" type="text" maxLength={field.role === 'event_name' ? 200 : 100} aria-labelledby="q-title"
            placeholder={t('form.placeholder')} value={typeof values[field.key] === 'string' ? (values[field.key] as string) : ''}
            onChange={(e) => setValue(field.key, e.target.value)} />
        )}
        {field?.type === 'date' && (
          <input className="big" type="date" max={today} aria-labelledby="q-title"
            value={typeof values[field.key] === 'string' ? (values[field.key] as string) : ''}
            onChange={(e) => setValue(field.key, e.target.value)} />
        )}
        {field?.type === 'textarea' && (
          <>
            <textarea className="big" rows={4} maxLength={2000} aria-labelledby="q-title"
              placeholder={t('form.placeholder')} value={typeof values[field.key] === 'string' ? (values[field.key] as string) : ''}
              onChange={(e) => setValue(field.key, e.target.value)} />
            <p className="hint">{t('form.newline')}</p>
          </>
        )}
        {field?.type === 'rating' && (
          <StarRating labelledBy="q-title" value={typeof values[field.key] === 'number' ? (values[field.key] as number) : 0}
            onChange={(n) => pickRating(field, n)} />
        )}

        {error && <p className="error-text" role="alert">{error}</p>}
        {status === 'error' && (
          <div className="alert alert-error" role="alert">
            {isConfigured
              ? t('form.errSave')
              : t('form.errDb')}
          </div>
        )}

        <div className="step-actions">
          {index > 0 && <button type="button" className="btn" onClick={back}><Icon name="arrowLeft" /> {t('form.back')}</button>}
          <button type="button" className="btn btn-primary" onClick={next} disabled={submitting}>
            {isLast ? (submitting ? t('form.submitting') : <>{t('form.submit')} <Icon name="send" /></>) : <>{t('form.ok')} <Icon name="check" /></>}
          </button>
          <span className="hint">{t('form.press')}</span>
        </div>
      </div>

      <div className="hp" aria-hidden="true">
        <label>Leave this field empty
          <input type="text" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
        </label>
      </div>
    </div>
  );
}
