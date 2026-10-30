import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="card confirm">
      <h1>Page not found</h1>
      <p className="muted">The page you are looking for does not exist.</p>
      <div className="actions">
        <Link to="/" className="btn btn-primary">Back to home</Link>
      </div>
    </div>
  );
}
