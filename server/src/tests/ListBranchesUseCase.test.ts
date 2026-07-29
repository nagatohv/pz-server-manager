import { describe, it, expect, vi } from 'vitest';
import ListBranchesUseCase from '../usecases/ListBranchesUseCase.js';
import type IBranchCatalogService from '../domain/ports/IBranchCatalogService.js';
import type { BranchCatalogSnapshot, BranchCatalogSubscriber } from '../domain/ports/IBranchCatalogService.js';
import type { BranchInfo } from '../types.js';

describe('ListBranchesUseCase', () => {
  const sampleSnapshot: BranchCatalogSnapshot = {
    branches: [
      { name: 'public', buildId: '1', timeUpdated: '', description: '', isDefault: true, isUnstable: false },
      { name: 'unstable', buildId: '2', timeUpdated: '', description: '', isDefault: false, isUnstable: true }
    ] as BranchInfo[],
    isLoading: false,
    error: null,
    fetchedAt: 1700000000000,
    source: 'steam'
  };

  it('forwards the snapshot from the catalog service', () => {
    const getSnapshot = vi.fn().mockReturnValue(sampleSnapshot);
    const fakeService = { getSnapshot } as unknown as IBranchCatalogService;
    const useCase = new ListBranchesUseCase(fakeService);

    expect(useCase.getSnapshot()).toBe(sampleSnapshot);
    expect(getSnapshot).toHaveBeenCalledTimes(1);
  });

  it('delegates refresh to the catalog service without throwing', () => {
    const refresh = vi.fn();
    const fakeService = { refresh } as unknown as IBranchCatalogService;
    const useCase = new ListBranchesUseCase(fakeService);

    useCase.refresh();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('returns the unsubscribe function from subscribe', () => {
    const unsubscribe = vi.fn();
    const subscribe = vi.fn().mockReturnValue(unsubscribe);
    const fakeService = { subscribe } as unknown as IBranchCatalogService;
    const useCase = new ListBranchesUseCase(fakeService);
    const sub = vi.fn();

    const off = useCase.subscribe(sub);
    expect(subscribe).toHaveBeenCalledWith(sub);
    expect(off).toBe(unsubscribe);
  });
});
