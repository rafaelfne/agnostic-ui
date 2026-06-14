import type { ReactElement } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

/**
 * App shell (ADR 0004). The router is the SPA's backbone; auth-gated routes and
 * the artifact editors are wired in the following waves. For now a single landing
 * route proves the toolchain end-to-end.
 */
export function App(): ReactElement {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <main>
              <h1>Agnostic UI — Builder</h1>
              <p>Console no-code para flows, telas e integrações.</p>
            </main>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
