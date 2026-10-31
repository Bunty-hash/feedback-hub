import { Link } from 'react-router-dom';
import { useT } from '../i18n';

export default function NotFound() {
  const t = useT();
  return (
    <div className="card confirm">
      <h1>{t('nf.title')}</h1>
      <p className="muted">{t('nf.body')}</p>
      <div className="actions">
        <Link to="/" className="btn btn-primary">{t('nf.home')}</Link>
      </div>
    </div>
  );
}
