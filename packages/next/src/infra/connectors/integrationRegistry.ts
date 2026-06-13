import {
  type IntegrationDefinition,
  IntegrationDefinitionSchema,
} from '@yukilabs/agnostic-ui-engine';

/** Looks up an IntegrationDefinition by id. In-code now; store-backed later. */
export interface IntegrationRegistry {
  get(id: string): IntegrationDefinition | undefined;
}

export class InMemoryIntegrationRegistry implements IntegrationRegistry {
  private readonly byId = new Map<string, IntegrationDefinition>();

  constructor(definitions: readonly unknown[]) {
    for (const raw of definitions) {
      const def = IntegrationDefinitionSchema.parse(raw);
      this.byId.set(def.id, def);
    }
  }

  get(id: string): IntegrationDefinition | undefined {
    return this.byId.get(id);
  }
}
