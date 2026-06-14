import { type ReactElement, useEffect, useMemo, useState } from 'react';

import { createBuilderClient } from '../api/client';
import type { ArtifactSummary } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { readEnv } from '../env';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; artifacts: ArtifactSummary[] };

export function ArtifactsPage(): ReactElement {
  const { token, signOut } = useAuth();
  const client = useMemo(
    () => createBuilderClient({ baseUrl: readEnv().apiBase, getToken: () => token }),
    [token],
  );
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    client
      .listArtifacts()
      .then((artifacts) => {
        if (active) setState({ status: 'ready', artifacts });
      })
      .catch((caught: unknown) => {
        if (active) {
          setState({
            status: 'error',
            message: caught instanceof Error ? caught.message : 'Erro ao carregar',
          });
        }
      });
    return () => {
      active = false;
    };
  }, [client]);

  return (
    <main>
      <header>
        <h1>Artefatos</h1>
        <button type="button" onClick={signOut}>
          Sair
        </button>
      </header>

      {state.status === 'loading' && <p>Carregando…</p>}
      {state.status === 'error' && <p role="alert">{state.message}</p>}
      {state.status === 'ready' &&
        (state.artifacts.length === 0 ? (
          <p>Nenhum artefato ainda.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Slug</th>
                <th>Última versão</th>
                <th>Publicada</th>
              </tr>
            </thead>
            <tbody>
              {state.artifacts.map((artifact) => (
                <tr key={`${artifact.kind}:${artifact.slug}`}>
                  <td>{artifact.kind}</td>
                  <td>{artifact.slug}</td>
                  <td>{artifact.latestVersion}</td>
                  <td>{artifact.publishedVersion ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
    </main>
  );
}
