import { describe, it, expect } from 'vitest';
import { filterAndSortInstances, DEFAULT_SERVER_FILTERS } from '../components/organisms/ServerFiltersBar.js';
import type { PzInstance } from '../types.js';

const buildInstance = (overrides: Partial<PzInstance> = {}): PzInstance => ({
  id: 'id-default',
  game: 'project-zomboid',
  name: 'default',
  branch: 'public',
  installed: true,
  status: 'STOPPED',
  installPath: '/data/instances/id-default/pzserver',
  dataPath: '/data/instances/id-default/Zomboid',
  gamePort: 16261,
  rconPort: 27015,
  maxPlayers: 16,
  lastError: null,
  createdAt: 1_000_000,
  updatedAt: 1_000_000,
  lastInstalledAt: 1_000_000,
  totalUptimeSeconds: 0,
  ...overrides
});

describe('filterAndSortInstances', () => {
  const alpha = buildInstance({ id: 'a', name: 'alpha', createdAt: 100 });
  const bravo = buildInstance({ id: 'b', name: 'bravo', createdAt: 200, branch: 'b42stable' });
  const charlie = buildInstance({ id: 'c', name: 'charlie', createdAt: 300, installed: false });
  const delta = buildInstance({ id: 'd', name: 'delta', createdAt: 400, branch: 'unstable' });
  const all: PzInstance[] = [delta, bravo, alpha, charlie];

  it('returns every instance in default order when no filters are active', () => {
    const result = filterAndSortInstances(all, DEFAULT_SERVER_FILTERS, null);
    expect(result.map((i) => i.id)).toEqual(['d', 'c', 'b', 'a']);
  });

  it('filters by name (case insensitive, substring)', () => {
    const result = filterAndSortInstances(all, { ...DEFAULT_SERVER_FILTERS, search: 'AL' }, null);
    expect(result.map((i) => i.id)).toEqual(['a']);
  });

  it('filters by installed status', () => {
    const installed = filterAndSortInstances(all, { ...DEFAULT_SERVER_FILTERS, installFilter: 'installed' }, null);
    expect(installed.map((i) => i.id).sort()).toEqual(['a', 'b', 'd']);

    const notInstalled = filterAndSortInstances(all, { ...DEFAULT_SERVER_FILTERS, installFilter: 'notInstalled' }, null);
    expect(notInstalled.map((i) => i.id)).toEqual(['c']);
  });

  it('filters by branch', () => {
    const result = filterAndSortInstances(all, { ...DEFAULT_SERVER_FILTERS, branchFilter: 'b42stable' }, null);
    expect(result.map((i) => i.id)).toEqual(['b']);
  });

  it('filters by activity (active vs inactive)', () => {
    const active = filterAndSortInstances(all, { ...DEFAULT_SERVER_FILTERS, activityFilter: 'active' }, 'b');
    expect(active.map((i) => i.id)).toEqual(['b']);

    const inactive = filterAndSortInstances(all, { ...DEFAULT_SERVER_FILTERS, activityFilter: 'inactive' }, 'b');
    expect(inactive.map((i) => i.id).sort()).toEqual(['a', 'c', 'd']);
  });

  it('treats an empty branch string as public', () => {
    const result = filterAndSortInstances(all, { ...DEFAULT_SERVER_FILTERS, branchFilter: 'public' }, null);
    expect(result.map((i) => i.id).sort()).toEqual(['a', 'c']);
  });

  it('sorts by name ascending and descending', () => {
    const asc = filterAndSortInstances(all, { ...DEFAULT_SERVER_FILTERS, sortBy: 'nameAsc' }, null);
    expect(asc.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']);

    const desc = filterAndSortInstances(all, { ...DEFAULT_SERVER_FILTERS, sortBy: 'nameDesc' }, null);
    expect(desc.map((i) => i.id)).toEqual(['d', 'c', 'b', 'a']);
  });

  it('sorts by created date ascending and descending', () => {
    const asc = filterAndSortInstances(all, { ...DEFAULT_SERVER_FILTERS, sortBy: 'createdAsc' }, null);
    expect(asc.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']);

    const desc = filterAndSortInstances(all, { ...DEFAULT_SERVER_FILTERS, sortBy: 'createdDesc' }, null);
    expect(desc.map((i) => i.id)).toEqual(['d', 'c', 'b', 'a']);
  });

  it('combines multiple filters together', () => {
    const result = filterAndSortInstances(
      all,
      { ...DEFAULT_SERVER_FILTERS, installFilter: 'installed', sortBy: 'nameAsc' },
      null
    );
    expect(result.map((i) => i.id)).toEqual(['a', 'b', 'd']);
  });

  it('returns empty array when no items match', () => {
    const result = filterAndSortInstances(all, { ...DEFAULT_SERVER_FILTERS, search: 'xyz' }, null);
    expect(result).toEqual([]);
  });
});
