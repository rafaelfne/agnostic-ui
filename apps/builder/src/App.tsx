import type { ReactElement } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';

import { AuthProvider, useAuth } from './auth/AuthContext';
import { LoginPage } from './auth/LoginPage';
import { AppShell } from './components/AppShell';
import { FlowEditorPage } from './flows/FlowEditorPage';
import { FlowsListPage } from './flows/FlowsListPage';
import { ArtifactsPage } from './pages/ArtifactsPage';
import { ScreenEditorPage } from './screens/ScreenEditorPage';
import { ScreensListPage } from './screens/ScreensListPage';

/** Redirects to /login when there is no session (ADR 0004 §3 — fail-closed UI). UNCHANGED guard. */
function RequireAuth({ children }: { children: ReactElement }): ReactElement {
  const { token } = useAuth();
  return token === null ? <Navigate to="/login" replace /> : children;
}

/** Authenticated layout: the shared shell (sidebar + topbar) wraps every page via <Outlet/>. */
function ProtectedLayout(): ReactElement {
  return (
    <RequireAuth>
      <AppShell>
        <Outlet />
      </AppShell>
    </RequireAuth>
  );
}

export function App(): ReactElement {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<ArtifactsPage />} />
            <Route path="/flows" element={<FlowsListPage />} />
            <Route path="/flows/:slug" element={<FlowEditorPage />} />
            <Route path="/screens" element={<ScreensListPage />} />
            <Route path="/screens/:slug" element={<ScreenEditorPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
