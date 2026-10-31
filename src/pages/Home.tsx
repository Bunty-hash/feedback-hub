import { Link } from 'react-router-dom';
import { CATEGORIES } from '../lib/categories';
import { Icon } from '../components/Icon';
import { useT } from '../i18n';
import type { Key } from '../i18n/en';

export default function Home() {
  const t = useT();
  return (
    <>
      <img className="home-banner" src="/be-your-best.webp" alt={t('home.bannerAlt')} width="850" height="290" />
      <section className="hero">
        <p className="kicker">{t('home.kicker')}</p>
        <h1>{t('home.title')}</h1>
        <p className="muted lead">{t('home.lead')}</p>
      </section>
      <section className="grid" aria-label={t('home.aria')}>
        {CATEGORIES.map((c, i) => (
          <Link key={c.slug} to={`/feedback/${c.slug}`} className="cat-card">
            <div className="cat-top"><span className="cat-icon"><Icon name={c.icon} size={30} /></span><span className="cat-num">{String(i + 1).padStart(2, '0')}</span></div>
            <h2>{t(`cat.${c.slug}.title` as Key)}</h2>
            <p className="muted">{t(`cat.${c.slug}.blurb` as Key)}</p>
            <span className="cat-cta">{t('home.start')} <Icon name="arrowRight" /></span>
          </Link>
        ))}
        <Link to="/panel" className="cat-card panel-card">
          <div className="cat-top"><span className="cat-icon"><Icon name="message" size={30} /></span><span className="cat-num">{String(CATEGORIES.length + 1).padStart(2, '0')}</span></div>
          <h2>{t('panel.title')}</h2>
          <p className="muted">{t('panel.blurb')}</p>
          <span className="cat-cta">{t('home.join')} <Icon name="arrowRight" /></span>
        </Link>
      </section>
    </>
  );
}
