import { useMemo } from 'react';
import { CATEGORIES } from '../lib/categories';
import Shelf, { type ShelfItem } from '../components/Shelf';

export default function Home() {
  const items = useMemo<ShelfItem[]>(
    () => [
      ...CATEGORIES.map((c, i) => ({ id: c.slug, to: `/feedback/${c.slug}`, title: c.title, blurb: c.blurb, icon: c.icon, cta: 'Start', tag: `Form ${String(i + 1).padStart(2, '0')} / Feedback`, spine: c.title.replace(/ Feedback$/, '').replace(/^Exhibition Training$/, 'Exhibition') })),
      { id: 'panel', to: '/panel', title: 'Panel', blurb: 'Join a live panel with a PIN. Ask questions and upvote.', icon: 'message' as const, cta: 'Join', tag: `Live ${String(CATEGORIES.length + 1).padStart(2, '0')} / Panel`, spine: 'Panel' },
    ],
    [],
  );
  return (
    <>
      <img className="home-banner" src="/be-your-best.webp" alt="MA University: Be your best" width="850" height="290" />
      <section className="home-intro">
        <p className="kicker">Feedback</p>
        <h1>Share your feedback</h1>
        <p className="muted lead">Pick a tape from the shelf. Click it to turn it, click again to open. About two minutes.</p>
      </section>
      <Shelf items={items} />
    </>
  );
}
