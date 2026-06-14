import { type FormEvent, type ReactElement, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import type { ArtifactSummary } from '../api/types';
import { useBuilderClient } from '../api/useBuilderClient';
import { Nav } from '../components/Nav';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; flows: ArtifactSummary[] };

export function FlowsListPage(): ReactElement {
  const client = useBuilderClient();
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [slug, setSlug] = useState('');

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    client
      .listArtifacts('flow')
      .then((flows) => {
        if (active) setState({ status: 'ready', flows });
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

  function onCreate(event: FormEvent): void {
    event.preventDefault();
    const trimmed = slug.trim();
    if (trimmed !== '') navigate(`/flows/${encodeURIComponent(trimmed)}`);
  }

  return (
    <main>
      <Nav />
      <h1>Flows</h1>

      <form onSubmit={onCreate}>
        <label>
          novo flow (slug)
          <input
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder="get-balance"
          />
        </label>
        <button type="submit">Abrir / criar</button>
      </form>

      {state.status === 'loading' && <p>Carregando…</p>}
      {state.status === 'error' && <p role="alert">{state.message}</p>}
      {state.status === 'ready' &&
        (state.flows.length === 0 ? (
          <p>Nenhum flow ainda.</p>
        ) : (
          <ul>
            {state.flows.map((flow) => (
              <li key={flow.slug}>
                <Link to={`/flows/${encodeURIComponent(flow.slug)}`}>{flow.slug}</Link> — v
                {flow.latestVersion}
                {flow.publishedVersion !== null ? ` (publicada v${flow.publishedVersion})` : ''}
              </li>
            ))}
          </ul>
        ))}
    </main>
  );
}
