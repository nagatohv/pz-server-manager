import type { BranchInfo } from '../../types.js';

/** Minimal branch shape that can still be classified (flags are derived). */
export type ClassifiableBranch = Omit<BranchInfo, 'isDefault' | 'isUnstable'> & {
  isDefault?: boolean;
  isUnstable?: boolean;
};

/** Configuration consumed by {@link BranchClassifier} to label and order branches. */
export interface BranchClassifierConfig {
  /** Lowercase branch names that should be considered the public/default Steam branch. */
  defaultBranchNames: readonly string[];
  /** Substrings (lowercase) that mark a branch as a pre-release / unstable channel. */
  unstableKeywords: readonly string[];
}

/**
 * Strategy (GoF) that classifies and orders raw Steam branch entries.
 * Pure, deterministic and dependency-free so it can be exercised in
 * isolation and reused outside the catalog adapter.
 */
export class BranchClassifier {
  private readonly defaultNames: ReadonlySet<string>;
  private readonly unstableKeywords: readonly string[];

  constructor(config: BranchClassifierConfig) {
    if (!config || !Array.isArray(config.defaultBranchNames) || config.defaultBranchNames.length === 0) {
      throw new Error('BranchClassifier requiere al menos un nombre de rama por defecto');
    }
    this.defaultNames = new Set(config.defaultBranchNames.map((name) => name.toLowerCase()));
    this.unstableKeywords = (config.unstableKeywords ?? []).map((keyword) => keyword.toLowerCase());
  }

  /** Returns a new {@link BranchInfo} with the classification flags set. */
  classify(branch: ClassifiableBranch): BranchInfo {
    const lower = (branch.name ?? '').toLowerCase();
    const isDefault = this.defaultNames.has(lower);
    const isUnstable = !isDefault && this.unstableKeywords.some((keyword) => lower.includes(keyword));
    return { ...branch, isDefault, isUnstable };
  }

  /** Returns a shallow copy of `branches` with classification flags applied. */
  classifyAll(branches: readonly ClassifiableBranch[]): BranchInfo[] {
    return branches.map((branch) => this.classify(branch));
  }

  /** Sorts branches: default first, stable branches alphabetically, unstable last. */
  sort(branches: readonly BranchInfo[]): BranchInfo[] {
    return [...branches].sort((a, b) => {
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      if (a.isUnstable !== b.isUnstable) return a.isUnstable ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }
}
