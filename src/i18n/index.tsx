import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import en, { type Dict, type Key } from './en';
import it from './it';
import de from './de';
import es from './es';
import zh from './zh';
import id from './id';
import th from './th';
import hi from './hi';
import ja from './ja';
import ko from './ko';
import ms from './ms';
import vi from './vi';

/** English first, then the Asian languages, then European. This order is used by the picker and the switcher. */
export const LANGS = [
  { code: 'en', name: 'English', dict: en as Dict },
  { code: 'zh', name: '简体中文', dict: zh, html: 'zh-Hans' },
  { code: 'ja', name: '日本語', dict: ja },
  { code: 'ko', name: '한국어', dict: ko },
  { code: 'id', name: 'Bahasa Indonesia', dict: id },
  { code: 'ms', name: 'Bahasa Melayu', dict: ms },
  { code: 'th', name: 'ไทย', dict: th },
  { code: 'vi', name: 'Tiếng Việt', dict: vi },
  { code: 'hi', name: 'हिन्दी', dict: hi },
  { code: 'it', name: 'Italiano', dict: it },
  { code: 'de', name: 'Deutsch', dict: de },
  { code: 'es', name: 'Español', dict: es },
] as const;
export type Lang = (typeof LANGS)[number]['code'];

const STORE = 'fh_lang';
const isLang = (v: unknown): v is Lang => LANGS.some((l) => l.code === v);
function readStored(): Lang | null {
  try { const v = localStorage.getItem(STORE); return isLang(v) ? v : null; } catch { return null; }
}
/** Best guess from the browser, used only to highlight a suggestion on the picker. */
export function guessLang(): Lang {
  for (const l of navigator.languages ?? [navigator.language]) {
    const c = l.toLowerCase().slice(0, 2);
    if (isLang(c)) return c;
  }
  return 'en';
}

interface Ctx { lang: Lang; chosen: boolean; setLang: (l: Lang) => void; t: (k: Key, vars?: Record<string, string | number>) => string }
const I18n = createContext<Ctx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<Lang | null>(readStored);
  const lang: Lang = stored ?? 'en';
  const setLang = useCallback((l: Lang) => {
    setStored(l);
    try { localStorage.setItem(STORE, l); } catch { /* private mode: keep in memory only */ }
  }, []);
  useEffect(() => {
    const entry = LANGS.find((l) => l.code === lang) as { html?: string } | undefined;
    document.documentElement.lang = entry?.html ?? lang;
  }, [lang]);
  const value = useMemo<Ctx>(() => {
    const dict = LANGS.find((l) => l.code === lang)!.dict;
    const t: Ctx['t'] = (k, vars) => {
      let s = dict[k] ?? en[k] ?? k;
      if (vars) for (const [n, v] of Object.entries(vars)) s = s.split(`{${n}}`).join(String(v));
      return s;
    };
    return { lang, chosen: stored !== null, setLang, t };
  }, [lang, stored, setLang]);
  return <I18n.Provider value={value}>{children}</I18n.Provider>;
}

export function useI18n(): Ctx {
  const c = useContext(I18n);
  if (!c) throw new Error('useI18n must be used inside LangProvider');
  return c;
}
export const useT = () => useI18n().t;

/** Compact switcher for the header, so people can change language at any time. */
export function LangSelect() {
  const { lang, setLang, t } = useI18n();
  return (
    <label className="lang-select">
      <span className="sr">{t('lang.label')}</span>
      <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label={t('lang.label')}>
        {LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
      </select>
    </label>
  );
}

/** First screen: shown until the visitor has picked a language. */
export function LanguagePicker() {
  const { setLang } = useI18n();
  const suggested = useMemo(guessLang, []);
  return (
    <div className="langpick">
      <img className="langpick-logo" src="/ma-logo.png" alt="MA" width="78" height="38" />
      <h1>Choose your language</h1>
      <p className="muted">Select the language you would like to use.</p>
      <ul className="langpick-grid">
        {LANGS.map((l) => (
          <li key={l.code}>
            <button type="button" lang={l.code} className={`langpick-btn${l.code === suggested ? ' suggested' : ''}`} onClick={() => setLang(l.code)}>
              {l.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
