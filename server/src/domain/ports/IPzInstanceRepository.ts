/**
 * Port for persisting and retrieving PzInstance records.
 * Implementations are responsible for the on-disk format; the rest of the
 * application only depends on the abstract CRUD + active-instance operations.
 */
import type { PzInstance, PzInstanceRegistry } from '../../types.js';

export default interface IPzInstanceRepository {
  /** Returns the full registry; empty array + null active when no instances exist. */
  load(): Promise<PzInstanceRegistry>;

  /** Atomically replaces the entire registry. */
  save(registry: PzInstanceRegistry): Promise<void>;

  /** Convenience helper that loads → mutates → saves the registry. */
  update(mutator: (registry: PzInstanceRegistry) => PzInstanceRegistry | Promise<PzInstanceRegistry>): Promise<PzInstanceRegistry>;

  /** Returns the instance with the given id, or null if not found. */
  findById(id: string): Promise<PzInstance | null>;

  /** Returns the instance with the given name, or null if not found. */
  findByName(name: string): Promise<PzInstance | null>;

  /** Returns the currently active instance, or null if none. */
  getActive(): Promise<PzInstance | null>;
}
