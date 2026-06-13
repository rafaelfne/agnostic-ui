/** An event raised by the `emit-event` operator during a flow run. */
export interface EmittedEvent {
  event: string;
  payload?: unknown;
}

export interface IEventBus {
  emit(event: EmittedEvent): void;
}

/** Default in-memory bus: collects emitted events for inspection. */
export class InMemoryEventBus implements IEventBus {
  readonly emitted: EmittedEvent[] = [];

  emit(event: EmittedEvent): void {
    this.emitted.push(event);
  }
}
