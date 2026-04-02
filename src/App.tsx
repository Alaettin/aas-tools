import { Suspense, Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/components/auth/LoginPage';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ToolSkeleton } from '@/components/tools/ToolSkeleton';
import { DashboardPage } from '@/pages/Dashboard';
import { UserManagementPage } from '@/pages/UserManagement';
import { UserDetailPage } from '@/pages/UserDetail';
import { SettingsPage } from '@/pages/Settings';
import { tools } from '@/tools/registry';

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

class ToolErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-bg-surface border border-border rounded p-8 text-center">
          <p className="text-sm text-red-400 mb-3">Das Tool ist abgestürzt.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-sm text-accent hover:text-accent-hover transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      );
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
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
