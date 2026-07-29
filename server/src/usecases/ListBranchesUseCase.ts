import IBranchCatalogService, { BranchCatalogSnapshot, BranchCatalogSubscriber } from '../domain/ports/IBranchCatalogService.js';

/**
 * Use case that exposes the Steam branch catalog to the HTTP layer.
 * Wraps the catalog service so controllers depend on a thin, intention-revealing
 * API instead of the concrete adapter.
 */
export default class ListBranchesUseCase {
  public branchCatalogService: IBranchCatalogService;

  constructor(branchCatalogService: IBranchCatalogService) {
    this.branchCatalogService = branchCatalogService;
  }

  getSnapshot(): BranchCatalogSnapshot {
    return this.branchCatalogService.getSnapshot();
  }

  refresh(): Promise<void> {
    return this.branchCatalogService.refresh();
  }

  subscribe(subscriber: BranchCatalogSubscriber): () => void {
    return this.branchCatalogService.subscribe(subscriber);
  }
}
