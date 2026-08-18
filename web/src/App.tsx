import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ErrorState, Loading, ToastProvider } from './components/ui';
import { AppProvider, useApp } from './lib/app-context';
import { Benchmark } from './pages/Benchmark';
import { BenchmarkDetail } from './pages/BenchmarkDetail';
import { Catalog } from './pages/Catalog';
import { Clients } from './pages/Clients';
import { Dashboard } from './pages/Dashboard';
import { Expenses } from './pages/Expenses';
import { Invoices } from './pages/Invoices';
import { Projects } from './pages/Projects';
import { QuotationEditor } from './pages/QuotationEditor';
import { Quotations } from './pages/Quotations';
import { QuotationView } from './pages/QuotationView';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

function Boot({ children }: { children: React.ReactNode }) {
  const { loading, error, refresh } = useApp();
  if (loading) return <Loading label="Starting ZenStudios…" />;
  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20">
        <ErrorState
          message={`${error} — is the API running? Try \`npm run dev\` from the project root.`}
          onRetry={() => void refresh()}
        />
      </div>
    );
  }
  return <>{children}</>;
}

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppProvider>
          <Boot>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="quotations" element={<Quotations />} />
                <Route path="quotations/new" element={<QuotationEditor />} />
                <Route path="quotations/:id" element={<QuotationView />} />
                <Route path="quotations/:id/edit" element={<QuotationEditor />} />
                <Route path="projects" element={<Projects />} />
                <Route path="projects/:id" element={<Projects />} />
                <Route path="invoices" element={<Invoices />} />
                <Route path="expenses" element={<Expenses />} />
                <Route path="reports" element={<Reports />} />
                <Route path="clients" element={<Clients />} />
                <Route path="catalog" element={<Catalog />} />
                <Route path="benchmark" element={<Benchmark />} />
                <Route path="benchmark/:id" element={<BenchmarkDetail />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Boot>
        </AppProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
