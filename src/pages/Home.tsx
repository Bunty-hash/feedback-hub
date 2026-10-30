import { Link } from 'react-router-dom';
import { CATEGORIES } from '../lib/categories';
import { Icon } from '../components/Icon';

export default function Home() {
  return (
    <>
      <img className="home-banner" src="/be-your-best.webp" alt="MA University: Be your best" width="850" height="290" />
      <section className="hero">
        <p className="kicker">Feedback</p>
        <h1>Share your feedback</h1>
        <p className="muted lead">Choose the form that matches your session. One question at a time, about two minutes.</p>
      </section>
      <section className="grid" aria-label="Feedback categories">
        {CATEGORIES.map((c, i) => (
          <Link key={c.slug} to={`/feedback/${c.slug}`} className="cat-card">
            <div className="cat-top"><span className="cat-icon"><Icon name={c.icon} size={30} /></span><span className="cat-num">{String(i + 1).padStart(2, '0')}</span></div>
            <h2>{c.title}</h2>
            <p className="muted">{c.blurb}</p>
            <span className="cat-cta">Start <Icon name="arrowRight" /></span>
          </Link>
        ))}
      </section>
    </>
  );
}
