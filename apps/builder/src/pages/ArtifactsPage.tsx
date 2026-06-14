import { type ReactElement, useEffect, useState } from 'react';

import type { ArtifactSummary } from '../api/types';
import { useBuilderClient } from '../api/useBuilderClient';
import { Nav } from '../components/Nav';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; artifacts: ArtifactSummary[] };

export function ArtifactsPage(): ReactElement {
  const client = useBuilderClient();
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
      <Nav />
      <h1>Artefatos</h1>

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
