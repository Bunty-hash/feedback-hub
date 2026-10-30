import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import AdminGate from './components/AdminGate';
import Home from './pages/Home';
import FormPage from './pages/FormPage';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/feedback/:slug" element={<FormPage />} />
        <Route
          path="/admin"
          element={
            <AdminGate>
              <Dashboard />
            </AdminGate>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
