import { Link } from 'react-router-dom';
import { CATEGORIES } from '../lib/categories';

export default function Home() {
  return (
    <>
      <section className="hero">
        <p className="kicker">Feedback</p>
        <h1>Share your feedback</h1>
        <p className="muted lead">Choose the form that matches your session. One question at a time, about two minutes.</p>
      </section>
      <section className="grid" aria-label="Feedback categories">
        {CATEGORIES.map((c, i) => (
          <Link key={c.slug} to={`/feedback/${c.slug}`} className="cat-card">
            <span className="cat-num">{String(i + 1).padStart(2, '0')}</span>
            <h2>{c.title}</h2>
            <p className="muted">{c.blurb}</p>
            <span className="cat-cta">Start →</span>
          </Link>
        ))}
      </section>
    </>
  );
}
