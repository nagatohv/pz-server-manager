/**
 * Interface/Port for the Steam branch catalog.
 * Defines the contract for discovering the available Steam branches of a given
 * application (e.g. Project Zomboid) without hardcoding their names.
 *
 * The catalog is designed for non-blocking access: HTTP consumers read the
 * current {@link BranchCatalogSnapshot} synchronously and subscribe to updates
 * instead of waiting for SteamCMD to finish.
 */
import type { BranchInfo } from '../../types.js';

/** Provenance of the branch list served in a snapshot. */
export type BranchCatalogSource = 'steam' | 'fallback';

export interface BranchCatalogSnapshot {
  /** Currently known branches. Empty when the catalog has not yet been fetched. */
  branches: BranchInfo[];
  /** True while a SteamCMD discovery process is in flight. */
  isLoading: boolean;
  /** Error message from the last failed refresh, or `null` if the last call succeeded. */
  error: string | null;
  /** Unix timestamp (ms) of the last successful refresh, or `null` if never succeeded. */
  fetchedAt: number | null;
  /** Where the branches in this snapshot came from. */
  source: BranchCatalogSource;
}

export type BranchCatalogSubscriber = (snapshot: BranchCatalogSnapshot) => void;

export default interface IBranchCatalogService {
  /** Returns the current snapshot synchronously. Safe to call at any time. */
  getSnapshot(): BranchCatalogSnapshot;

  /** Registers a subscriber that receives every snapshot change. Returns an unsubscribe fn. */
  subscribe(subscriber: BranchCatalogSubscriber): () => void;

  /**
   * Triggers a refresh of the catalog. Returns a Promise that resolves
   * when the current fetch cycle ends (success or error). Concurrent calls
   * are deduplicated into a single SteamCMD invocation and all awaiters
   * receive the same resolution.
   * Never throws — failures are reported through the snapshot's `error` field.
   */
  refresh(): Promise<void>;
}
