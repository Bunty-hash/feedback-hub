import { useEffect, useRef } from 'react';

/** Large ring cursor on fine pointers: shrinks over links, becomes an OPEN disc over the active cover. */
export default function CustomCursor() {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (typeof matchMedia !== 'function' || !matchMedia('(pointer: fine)').matches) return;
    const node = el.current!;
    document.body.classList.add('has-cursor');
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y, raf = 0, last = performance.now();
    let target: Element | null = null;
    let state = 'hidden';
    const move = (e: PointerEvent) => { x = e.clientX; y = e.clientY; target = e.target as Element | null; };
    const leave = () => { target = null; };
    function frame(t: number) {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      cx += (x - cx) * (1 - Math.exp(-16 * dt));
      cy += (y - cy) * (1 - Math.exp(-16 * dt));
      node.style.transform = `translate3d(${cx}px,${cy}px,0)`;
      let s = 'default';
      if (!target) s = 'hidden';
      else if (target.closest?.('input,textarea,select')) s = 'hidden';
      else if (document.documentElement.dataset.cur) s = document.documentElement.dataset.cur!;
      else if (target.closest?.('a,button,[role="button"],summary')) s = 'btn';
      if (s !== state) { state = s; node.dataset.state = s; }
      raf = requestAnimationFrame(frame);
    }
    node.dataset.state = 'hidden';
    raf = requestAnimationFrame(frame);
    window.addEventListener('pointermove', move);
    document.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', leave);
      document.body.classList.remove('has-cursor');
    };
  }, []);
  return (
    <div className="cursor" ref={el} aria-hidden="true">
      <span className="cursor-ring" />
      <span className="cursor-dot" />
      <span className="cursor-label">OPEN</span>
    </div>
  );
}
