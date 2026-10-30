import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

export interface ShelfItem { id: string; to: string; title: string; blurb: string; icon: IconName; cta: string; tag: string; spine: string }
interface Layer { id: number; idx: number; dir: number; leaving: boolean; initial: boolean }

const COPIES = 5;
const EASE = 'cubic-bezier(.2,.8,.2,1)';
const smooth = (x: number) => x * x * (3 - 2 * x);
const B = (r: number) => (Math.abs(r) < 1 ? (r + Math.sin(Math.PI * r) / Math.PI) / 2 : Math.sign(r) * 0.5);
const pad = (n: number) => String(n).padStart(2, '0');
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function CaptionLayer({ layer, item }: { layer: Layer; item: ShelfItem }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || layer.initial || reducedMotion()) return;
    el.animate([{ transform: `translateY(${layer.dir * 105}%)` }, { transform: 'translateY(0)' }], { duration: 650, easing: EASE, fill: 'both' });
  }, [layer.initial, layer.dir]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !layer.leaving || reducedMotion()) return;
    const from = getComputedStyle(el).transform;
    el.getAnimations().forEach((a) => a.cancel());
    el.animate([{ transform: from === 'none' ? 'translateY(0)' : from }, { transform: `translateY(${-layer.dir * 105}%)` }], { duration: 650, easing: EASE, fill: 'both' });
  }, [layer.leaving, layer.dir]);
  return (
    <div className="cap-layer" ref={ref} aria-hidden={layer.leaving}>
      <p className="cap-tag">{item.tag}</p>
      <h2 className="cap-title">{item.title}</h2>
      <p className="cap-blurb">{item.blurb}</p>
      <Link className="btn btn-primary cap-cta" to={item.to}>{item.cta} <Icon name="arrowRight" /></Link>
    </div>
  );
}

/** Endless 3D shelf of tapes. The centred tape turns to show its cover; click it to open. */
export default function Shelf({ items }: { items: ShelfItem[] }) {
  const N = items.length;
  const TOTAL = N * COPIES;
  const nav = useNavigate();
  const wrap = useRef<HTMLDivElement>(null);
  const tapes = useRef<(HTMLDivElement | null)[]>([]);
  const covers = useRef<(HTMLDivElement | null)[]>([]);
  const S = useRef({ s: 0, T: 0, hover: -1, mx: 0, my: 0, mouse: false, tx: 0, ty: 0, drag: false, down: false, x0: 0, T0: 0, suppress: false, open: false, active: 0, dir: 1, H: 300, ws: 50, d: 150, gap: 9, cur: '' });
  const counter = useRef(0);
  const [active, setActive] = useState(0);
  const [layers, setLayers] = useState<Layer[]>([{ id: 0, idx: 0, dir: 1, leaving: false, initial: true }]);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const id = ++counter.current;
    const dir = S.current.dir;
    setLayers((p) => [...p.map((l) => ({ ...l, leaving: true, dir })), { id, idx: active, dir, leaving: false, initial: false }]);
    const t = window.setTimeout(() => setLayers((p) => p.filter((l) => !l.leaving || l.id === id)), 720);
    return () => window.clearTimeout(t);
  }, [active]);

  useEffect(() => {
    const st = S.current;
    const el = wrap.current!;
    const reduce = reducedMotion();
    const lifts = new Array(TOTAL).fill(0);
    const hidden = new Array(TOTAL).fill(false);
    let overlay: HTMLDivElement | null = null;
    let wheelTimer = 0;
    let raf = 0;
    let last = performance.now();

    function measure() {
      const w = innerWidth, h = innerHeight;
      const H = w < 768 ? Math.min(w * 0.6, h * 0.4) : Math.min(h * 0.42, w * 0.3, 380);
      st.H = H; st.ws = (H * 142) / 840; st.d = (H * 474) / 900; st.gap = H * 0.03;
      el.style.setProperty('--H', `${H}px`);
      el.style.setProperty('--ws', `${st.ws}px`);
      el.style.setProperty('--d', `${st.d}px`);
      el.style.height = `${H + 80}px`;
    }
    measure();

    const rel = (v: number) => { let r = (((v - st.s) % TOTAL) + TOTAL) % TOTAL; if (r > TOTAL / 2) r -= TOTAL; return r; };
    const setCur = (c: string) => { if (st.cur !== c) { st.cur = c; if (c) document.documentElement.dataset.cur = c; else delete document.documentElement.dataset.cur; } };

    function frame(t: number) {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const k = reduce ? 1 : st.drag ? 18 : 5.2;
      st.s += (st.T - st.s) * (1 - Math.exp(-k * dt));
      if (Math.abs(st.T - st.s) < 1e-4) st.s = st.T;
      if (Math.abs(st.s) > TOTAL * 3) { const n = Math.round(st.s / TOTAL) * TOTAL; st.s -= n; st.T -= n; }

      const a = ((Math.round(st.s) % N) + N) % N;
      if (a !== st.active) { st.active = a; st.dir = Math.sign(st.T - st.s) || 1; setActive(a); }

      const W = innerWidth, { H, ws, d, gap } = st;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      const dxm = st.mx - cx, dym = st.my - cy;
      const onCover = st.mouse && !st.open && Math.abs(dxm) < 0.55 * d && Math.abs(dym) < 0.55 * H && Math.abs(st.T - st.s) < 0.3;
      const tyT = !st.mouse ? 0 : onCover ? (dxm / (0.55 * d)) * 9 : ((st.mx - W / 2) / W) * 5;
      const txT = onCover ? (-dym / (H / 2)) * 6 : 0;
      const ke = reduce ? 1 : 1 - Math.exp(-7 * dt);
      st.ty += (tyT - st.ty) * ke; st.tx += (txT - st.tx) * ke;

      let hovering = false;
      for (let v = 0; v < TOTAL; v++) {
        const tp = tapes.current[v];
        if (!tp) continue;
        const r = rel(v);
        const x = r * (ws + gap) + (d - ws + 1.6 * gap) * B(r);
        const off = Math.abs(x) > W / 2 + 1.5 * d;
        if (off !== hidden[v]) { hidden[v] = off; tp.style.visibility = off ? 'hidden' : 'visible'; }
        if (off) continue;
        const o = smooth(Math.max(0, 1 - Math.abs(r)));
        const target = st.hover === v && Math.abs(r) > 0.5 ? 1 : 0;
        if (target === 1) hovering = true;
        lifts[v] += (target - lifts[v]) * (reduce ? 1 : 1 - Math.exp(-12 * dt));
        tp.style.transform = `translate3d(${x}px,${-(o * 0.025 * H + lifts[v] * 0.045 * H)}px,${o * 0.2 * H}px) rotateZ(${-4.5 * o}deg) rotateX(${st.tx * o}deg) rotateY(${-90 * o + st.ty * o}deg)`;
        tp.style.zIndex = String(Math.round(100 - Math.abs(r) * 4));
        tp.style.setProperty('--shs', String(o * 0.55));
        tp.style.setProperty('--shc', String((1 - o) * 0.5));
      }
      setCur(onCover ? 'open' : hovering ? 'spine' : '');
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    function nearest() { let best = 0, bd = 1e9; for (let v = 0; v < TOTAL; v++) { const d2 = Math.abs(rel(v)); if (d2 < bd) { bd = d2; best = v; } } return best; }

    function openActive() {
      if (st.open) return;
      const item = items[st.active];
      const cv = covers.current[nearest()];
      if (reduce || !cv) { nav(item.to); return; }
      st.open = true;
      const r = cv.getBoundingClientRect();
      const W = innerWidth, Hh = innerHeight;
      const ov = document.createElement('div');
      ov.className = 'sheet-overlay';
      const label = document.createElement('span');
      label.textContent = item.title;
      ov.appendChild(label);
      ov.style.transformOrigin = `${r.left + r.width / 2}px ${r.top + r.height / 2}px`;
      document.body.appendChild(ov);
      overlay = ov;
      const anim = ov.animate(
        [
          { clipPath: `inset(${r.top}px ${W - r.right}px ${Hh - r.bottom}px ${r.left}px round 3px)`, transform: 'rotate(-4.5deg)' },
          { clipPath: 'inset(0px 0px 0px 0px round 0px)', transform: 'rotate(0deg)' },
        ],
        { duration: 900, easing: 'cubic-bezier(.76,0,.18,1)', fill: 'both' },
      );
      anim.finished.then(() => {
        nav(item.to);
        window.setTimeout(() => {
          const o = overlay;
          if (!o) return;
          o.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'both' }).finished.then(() => o.remove());
        }, 120);
      }).catch(() => { /* cancelled */ });
    }

    function clickTape(v: number) {
      if (st.suppress || st.open) return;
      const r = rel(v);
      if (Math.abs(r) < 0.5) openActive(); else st.T = Math.round(st.T + r);
    }
    (el as HTMLDivElement & { _click?: (v: number) => void })._click = clickTape;

    const onMove = (e: PointerEvent) => {
      st.mx = e.clientX; st.my = e.clientY; st.mouse = e.pointerType === 'mouse';
      if (st.down && !st.drag && Math.abs(e.clientX - st.x0) > 5) st.drag = true;
      if (st.drag) st.T = st.T0 - (e.clientX - st.x0) / (st.ws + st.gap);
    };
    const onUp = () => {
      if (st.drag) { st.T = Math.round(st.T); st.suppress = true; window.setTimeout(() => { st.suppress = false; }, 0); }
      st.down = false; st.drag = false;
    };
    const onDown = (e: PointerEvent) => { if (st.open) return; st.down = true; st.x0 = e.clientX; st.T0 = st.T; };
    const onWheel = (e: WheelEvent) => {
      if (st.open || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      st.T += (e.deltaX / (st.ws + st.gap)) * 0.5;
      window.clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(() => { st.T = Math.round(st.T); }, 160);
    };
    const onKey = (e: KeyboardEvent) => {
      if (st.open || e.target !== document.body) return;
      if (e.key === 'ArrowLeft') st.T = Math.round(st.T) - 1;
      else if (e.key === 'ArrowRight') st.T = Math.round(st.T) + 1;
      else if (e.key === 'Enter') openActive();
    };
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(wheelTimer);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', measure);
      delete document.documentElement.dataset.cur;
      overlay?.remove();
    };
  }, [TOTAL, N, items, nav]);

  const click = (v: number) => (wrap.current as (HTMLDivElement & { _click?: (v: number) => void }) | null)?._click?.(v);
  const step = (n: number) => { S.current.T = Math.round(S.current.T) + n; };

  return (
    <section aria-label="Feedback options" className="shelf-full">
      <div className="shelf" ref={wrap}>
        <div className="shelf-stage" aria-hidden="true">
          {Array.from({ length: TOTAL }, (_, v) => {
            const i = v % N, it = items[i];
            return (
              <div key={v} className="tape" ref={(e) => { tapes.current[v] = e; }} onClick={() => click(v)}
                onPointerEnter={() => { S.current.hover = v; }} onPointerLeave={() => { if (S.current.hover === v) S.current.hover = -1; }}>
                <div className="face sp">
                  <span className="sp-num">{pad(i + 1)}</span>
                  <span className="sp-title">{it.spine}</span>
                  <span className="sp-mark">MA</span>
                </div>
                <div className="face cv" ref={(e) => { covers.current[v] = e; }}>
                  <span className="cv-top">MA University</span>
                  <span className="cv-icon"><Icon name={it.icon} size={34} /></span>
                  <strong className="cv-title">{it.title}</strong>
                  <span className="cv-blurb">{it.blurb}</span>
                  <span className="cv-cta">{it.cta}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="shelf-foot">
        <button type="button" className="shelf-arrow left" aria-label="Previous option" onClick={() => step(-1)}>
          <svg width="18" height="10" viewBox="0 0 18 10" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M5 1 1 5l4 4M1 5h16" /></svg>
        </button>
        <div className="cap" aria-live="polite">
          {layers.map((l) => <CaptionLayer key={l.id} layer={l} item={items[l.idx]} />)}
        </div>
        <button type="button" className="shelf-arrow right" aria-label="Next option" onClick={() => step(1)}>
          <svg width="18" height="10" viewBox="0 0 18 10" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="m13 1 4 4-4 4M17 5H1" /></svg>
        </button>
      </div>
      <ul className="sr">{items.map((it) => <li key={it.id}><Link to={it.to}>{it.title}</Link></li>)}</ul>
      <span className="sr" aria-hidden="true">{active}</span>
    </section>
  );
}
