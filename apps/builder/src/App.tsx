import type { ReactElement } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider, useAuth } from './auth/AuthContext';
import { LoginPage } from './auth/LoginPage';
import { ArtifactsPage } from './pages/ArtifactsPage';

/** Redirects to /login when there is no session (ADR 0004 §3 — fail-closed UI). */
function RequireAuth({ children }: { children: ReactElement }): ReactElement {
  const { token } = useAuth();
  return token === null ? <Navigate to="/login" replace /> : children;
}

/**
 * App shell (ADR 0004). Auth wraps the router; the artifact list is the first
 * authenticated screen. The flow/screen editors and the integration wizard are
 * added as further routes in the next waves.
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
