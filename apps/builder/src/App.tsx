import type { ReactElement } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider, useAuth } from './auth/AuthContext';
import { LoginPage } from './auth/LoginPage';
import { FlowEditorPage } from './flows/FlowEditorPage';
import { FlowsListPage } from './flows/FlowsListPage';
import { ArtifactsPage } from './pages/ArtifactsPage';

/** Redirects to /login when there is no session (ADR 0004 §3 — fail-closed UI). */
function RequireAuth({ children }: { children: ReactElement }): ReactElement {
  const { token } = useAuth();
  return token === null ? <Navigate to="/login" replace /> : children;
}

/**
 * App shell (ADR 0004). Auth wraps the router; the artifact list and the flow
 * editor are the first authenticated screens. The screen editor and the
 * integration wizard are added as further routes in the next waves.
 */
export function App(): ReactElement {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <ArtifactsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/flows"
            element={
              <RequireAuth>
                <FlowsListPage />
              </RequireAuth>
            }
          />
          <Route
            path="/flows/:slug"
            element={
              <RequireAuth>
                <FlowEditorPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
