import { NavLink } from 'react-router-dom';
import { Icon } from './Icon';

export default function AdminNav() {
  return (
    <nav className="admin-nav" aria-label="Administrator sections">
      <NavLink to="/admin" end><Icon name="chart" /> Dashboard</NavLink>
      <NavLink to="/admin/panel"><Icon name="message" /> Panel channels</NavLink>
    </nav>
  );
}
