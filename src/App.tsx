import { Route, Routes, useLocation } from 'react-router-dom';
import { LanguagePicker, useI18n } from './i18n';
import { Layout } from './components/Layout';
import AdminGate from './components/AdminGate';
import Home from './pages/Home';
import FormPage from './pages/FormPage';
import Dashboard from './pages/Dashboard';
import HostsAdmin from './pages/HostsAdmin';
import PanelAdmin from './pages/PanelAdmin';
import PanelJoin from './pages/PanelJoin';
import PanelRoom from './pages/PanelRoom';
import NotFound from './pages/NotFound';

export default function App() {
  const { chosen } = useI18n();
  const { pathname } = useLocation();
  // First thing every participant sees: choose a language. Staff pages (/admin) skip it.
  if (!chosen && !pathname.startsWith('/admin')) return <LanguagePicker />;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/panel" element={<PanelJoin />} />
        <Route path="/panel/:code" element={<PanelRoom />} />
        <Route path="/feedback/:slug" element={<FormPage />} />
        <Route
          path="/admin"
          element={
            <AdminGate masterOnly>
              <Dashboard />
            </AdminGate>
          }
        />
        <Route
          path="/admin/panel"
          element={
            <AdminGate>
              <PanelAdmin />
            </AdminGate>
          }
        />
        <Route
          path="/admin/hosts"
          element={
            <AdminGate masterOnly>
              <HostsAdmin />
            </AdminGate>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
