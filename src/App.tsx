import { Suspense, Component, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LocaleProvider, useLocale } from '@/context/LocaleContext';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/components/auth/LoginPage';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ToolSkeleton } from '@/components/tools/ToolSkeleton';
import { DashboardPage } from '@/pages/Dashboard';
import { UserManagementPage } from '@/pages/UserManagement';
import { UserDetailPage } from '@/pages/UserDetail';
import { SettingsPage } from '@/pages/Settings';
import { tools } from '@/tools/registry';

const LazyDocsAdmin = lazy(() => import('@/docs/index').then(m => ({ default: m.DocsAdmin })));
const LazyDocReader = lazy(() => import('@/docs/index').then(m => ({ default: m.DocReader })));

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function ToolErrorFallback({ onRetry }: { onRetry: () => void }) {
  const { t } = useLocale();
  return (
    <div className="bg-bg-surface border border-border rounded p-8 text-center">
      <p className="text-sm text-red-400 mb-3">{t('error.toolCrashed')}</p>
      <button onClick={onRetry} className="text-sm text-accent hover:text-accent-hover transition-colors">
        {t('error.tryAgain')}
      </button>
    </div>
  );
}

class ToolErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return <ToolErrorFallback onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}

function ToolAccessGuard({ toolId, children }: { toolId: string; children: React.ReactNode }) {
  const { isAdmin, toolAccess } = useAuth();
  if (!isAdmin && !toolAccess.includes(toolId)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function DocAccessGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, docAccess } = useAuth();
  // Admins always have access; regular users need docAccess checked by RLS
  if (!isAdmin && docAccess.length === 0) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={
          <AuthRedirect>
            <LoginPage />
          </AuthRedirect>
        }
      />

      {/* Protected */}
      <Route
        element={
          <AuthGuard>
            <AppShell />
          </AuthGuard>
        }
      >
        <Route index element={<DashboardPage />} />
        {tools.filter(t => t.status !== 'coming_soon').map(tool => (
          <Route
            key={tool.id}
            path={`tools/${tool.id}/*`}
            element={
              <ToolAccessGuard toolId={tool.id}>
                <ToolErrorBoundary>
                  <Suspense fallback={<ToolSkeleton />}>
                    <tool.component />
                  </Suspense>
                </ToolErrorBoundary>
              </ToolAccessGuard>
            }
          />
        ))}
        <Route
          path="users"
          element={
            <AuthGuard requireAdmin>
              <UserManagementPage />
            </AuthGuard>
          }
        />
        <Route
          path="users/:userId"
          element={
            <AuthGuard requireAdmin>
              <UserDetailPage />
            </AuthGuard>
          }
        />
        <Route path="settings" element={<SettingsPage />} />

        {/* Docs Admin */}
        <Route
          path="docs/admin/*"
          element={
            <AuthGuard requireAdmin>
              <Suspense fallback={<ToolSkeleton />}>
                <LazyDocsAdmin />
              </Suspense>
            </AuthGuard>
          }
        />

        {/* Docs Reader */}
        <Route
          path="docs/:manualSlug/*"
          element={
            <DocAccessGuard>
              <Suspense fallback={<ToolSkeleton />}>
                <LazyDocReader />
              </Suspense>
            </DocAccessGuard>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <LocaleProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </LocaleProvider>
    </BrowserRouter>
  );
}
