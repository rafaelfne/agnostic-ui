import type { StepDef } from '@yukilabs/agnostic-ui-engine';
import { type ReactElement, useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { BuilderApiError } from '../api/client';
import type { ArtifactVersion } from '../api/types';
import { useBuilderClient } from '../api/useBuilderClient';
import { Nav } from '../components/Nav';
import { StringListInput } from '../components/StringListInput';

import { FlowCanvasPlaceholder } from './FlowCanvasPlaceholder';
import { StepEditor } from './StepEditor';
import { type FlowDraft, type StepOp, emptyFlow, emptyStep, validateFlow } from './flowModel';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

function describeError(caught: unknown): string {
  if (caught instanceof BuilderApiError) {
    return caught.detail === undefined
      ? `Falhou: ${caught.code}`
      : `Falhou: ${caught.code} — ${caught.detail}`;
  }
  return caught instanceof Error ? caught.message : 'Erro inesperado';
}

function exprText(value: unknown): string {
  if (value === undefined) return '';
  return typeof value === 'string' ? value : JSON.stringify(value);
}

export function FlowEditorPage(): ReactElement {
  const { slug = '' } = useParams();
  const client = useBuilderClient();

  const [draft, setDraft] = useState<FlowDraft | null>(null);
  const [versions, setVersions] = useState<ArtifactVersion[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<'editor' | 'canvas'>('editor');

  const refreshVersions = useCallback(async () => {
    setVersions(await client.listVersions('flow', slug));
  }, [client, slug]);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    client
      .listVersions('flow', slug)
      .then((loaded) => {
        if (!active) return;
        setVersions(loaded);
        setDraft((loaded[0]?.body as FlowDraft | undefined) ?? emptyFlow(slug));
        setStatus('ready');
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setLoadError(describeError(caught));
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [client, slug]);

  if (status === 'loading') {
    return (
      <main>
        <Nav />
        <p>Carregando…</p>
      </main>
    );
  }
  if (status === 'error' || draft === null) {
    return (
      <main>
        <Nav />
        <p role="alert">{loadError ?? 'Erro ao carregar'}</p>
      </main>
    );
  }

  const steps: StepDef[] = Array.isArray(draft.steps) ? draft.steps : [];
  const input = draft.input ?? { from: 'executionContext', pick: [] };
  const validation = validateFlow(draft);

  const update = (changes: Partial<FlowDraft>): void => setDraft({ ...draft, ...changes });
  const updateStep = (index: number, next: StepDef): void =>
    update({ steps: steps.map((step, idx) => (idx === index ? next : step)) });

  async function saveDraft(): Promise<number | null> {
    setBusy(true);
    setNotice(null);
    try {
      const version = await client.saveDraft('flow', slug, draft);
      await refreshVersions();
      setNotice(`Rascunho salvo (v${version}).`);
      return version;
    } catch (caught) {
      setNotice(describeError(caught));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function publish(): Promise<void> {
    setBusy(true);
    setNotice(null);
    try {
      const version = await client.saveDraft('flow', slug, draft);
      await client.publish('flow', slug, version);
      await refreshVersions();
      setNotice(`Publicado (v${version}).`);
    } catch (caught) {
      setNotice(describeError(caught));
    } finally {
      setBusy(false);
    }
  }

  async function publishExisting(version: number): Promise<void> {
    setBusy(true);
    setNotice(null);
    try {
      await client.publish('flow', slug, version);
      await refreshVersions();
      setNotice(`Publicado (v${version}).`);
    } catch (caught) {
      setNotice(describeError(caught));
    } finally {
      setBusy(false);
    }
  }

  const trigger = draft.trigger;
  const triggerKind = trigger?.kind ?? 'none';

  return (
    <main>
      <Nav />
      <h1>Flow: {slug}</h1>

      <nav>
        <button type="button" onClick={() => setView('editor')} disabled={view === 'editor'}>
          Editor
        </button>{' '}
        <button type="button" onClick={() => setView('canvas')} disabled={view === 'canvas'}>
          Canvas
        </button>
      </nav>

      {view === 'canvas' ? (
        <FlowCanvasPlaceholder flow={draft} />
      ) : (
        <>
          <section>
            <label>
              id
              <input value={draft.id} onChange={(event) => update({ id: event.target.value })} />
            </label>
            <label>
              name
              <input
                value={draft.name}
                onChange={(event) => update({ name: event.target.value })}
              />
            </label>
            <label>
              output (expr)
              <input
                value={exprText(draft.output)}
                onChange={(event) => update({ output: event.target.value })}
              />
            </label>
            <StringListInput
              label="emits"
              value={draft.emits ?? []}
              onChange={(emits) => update({ emits })}
            />
          </section>

          <section>
            <h2>Trigger</h2>
            <label>
              tipo
              <select
                value={triggerKind}
                onChange={(event) =>
                  update({
                    trigger:
                      event.target.value === 'http'
                        ? { kind: 'http', method: 'GET', path: `/api/${slug}` }
                        : undefined,
                  })
                }
              >
                <option value="none">nenhum</option>
                <option value="http">http</option>
              </select>
            </label>
            {trigger?.kind === 'http' && (
              <>
                <label>
                  método
                  <select
                    value={trigger.method}
                    onChange={(event) =>
                      update({
                        trigger: {
                          ...trigger,
                          method: event.target.value as (typeof HTTP_METHODS)[number],
                        },
                      })
                    }
                  >
                    {HTTP_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  path
                  <input
                    value={trigger.path}
                    onChange={(event) =>
                      update({ trigger: { ...trigger, path: event.target.value } })
                    }
                  />
                </label>
              </>
            )}
          </section>

          <section>
            <h2>Input</h2>
            <label>
              from
              <select
                value={input.from ?? 'executionContext'}
                onChange={(event) =>
                  update({ input: { ...input, from: event.target.value as typeof input.from } })
                }
              >
                <option value="executionContext">executionContext</option>
                <option value="request">request</option>
                <option value="none">none</option>
              </select>
            </label>
            <StringListInput
              label="pick"
              value={input.pick ?? []}
              onChange={(pick) => update({ input: { ...input, pick } })}
            />
          </section>

          <section>
            <h2>Steps</h2>
            {steps.map((step, index) => (
              <StepEditor
                key={index}
                step={step}
                index={index}
                onChange={(next) => updateStep(index, next)}
                onRemove={() => update({ steps: steps.filter((_, idx) => idx !== index) })}
              />
            ))}
            <label>
              adicionar step
              <select
                value=""
                onChange={(event) => {
                  if (event.target.value === '') return;
                  update({ steps: [...steps, emptyStep(event.target.value as StepOp)] });
                }}
              >
                <option value="">+ step…</option>
                {(
                  [
                    'validate',
                    'call-integration',
                    'compose-template',
                    'branch',
                    'emit-event',
                  ] as const
                ).map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section>
            <h2>Validação</h2>
            {validation.ok ? (
              <p>Schema válido ✓</p>
            ) : (
              <ul>
                {validation.issues.map((issue, index) => (
                  <li key={index} role="alert">
                    <code>{issue.path}</code>: {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <button type="button" onClick={() => void saveDraft()} disabled={busy}>
              Salvar rascunho
            </button>{' '}
            <button type="button" onClick={() => void publish()} disabled={busy || !validation.ok}>
              Salvar e publicar
            </button>
            {notice !== null && <p role="status">{notice}</p>}
          </section>

          <section>
            <h2>Versões</h2>
            {versions.length === 0 ? (
              <p>Nenhuma versão salva ainda.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Versão</th>
                    <th>Status</th>
                    <th>Criada</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {versions.map((version) => (
                    <tr key={version.version}>
                      <td>{version.version}</td>
                      <td>{version.status}</td>
                      <td>{version.createdAt}</td>
                      <td>
                        {version.status !== 'published' && (
                          <button
                            type="button"
                            onClick={() => void publishExisting(version.version)}
                            disabled={busy}
                          >
                            Publicar esta
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </main>
  );
}
