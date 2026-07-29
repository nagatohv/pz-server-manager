import { describe, it, expect } from 'vitest';
import {
  BranchClassifier,
  BranchClassifierConfig
} from '../adapters/parsers/BranchClassifier.js';
import type { BranchInfo } from '../types.js';

const baseBranch: BranchInfo = {
  name: '',
  buildId: '',
  timeUpdated: '',
  description: '',
  isDefault: false,
  isUnstable: false
};

describe('BranchClassifier Strategy', () => {
  const baseConfig: BranchClassifierConfig = {
    defaultBranchNames: ['public'],
    unstableKeywords: ['unstable', 'beta', 'alpha', 'b42stable']
  };

  it('marks the configured default branch name as isDefault', () => {
    const classifier = new BranchClassifier(baseConfig);
    const result = classifier.classify({ ...baseBranch, name: 'public' });
    expect(result.isDefault).toBe(true);
    expect(result.isUnstable).toBe(false);
  });

  it('matches the default branch name case-insensitively', () => {
    const classifier = new BranchClassifier(baseConfig);
    const result = classifier.classify({ ...baseBranch, name: 'PUBLIC' });
    expect(result.isDefault).toBe(true);
  });

  it('flags a branch as unstable when its name contains any unstable keyword', () => {
    const classifier = new BranchClassifier(baseConfig);
    expect(classifier.classify({ ...baseBranch, name: 'unstable' }).isUnstable).toBe(true);
    expect(classifyNamed(classifier, 'something-beta').isUnstable).toBe(true);
    expect(classifyNamed(classifier, 'b42stable').isUnstable).toBe(true);
  });

  it('does not flag non-matching branch names as unstable', () => {
    const classifier = new BranchClassifier(baseConfig);
    expect(classifier.classify({ ...baseBranch, name: 'public' }).isUnstable).toBe(false);
  });

  it('returns a new object without mutating the input', () => {
    const classifier = new BranchClassifier(baseConfig);
    const input: BranchInfo = { ...baseBranch, name: 'public', buildId: '1' };
    const result = classifier.classify(input);
    expect(result).not.toBe(input);
    expect(input.isDefault).toBe(false);
  });

  it('sorts branches with the default first, unstable last, alphabetically otherwise', () => {
    const classifier = new BranchClassifier(baseConfig);
    const input: BranchInfo[] = [
      { ...baseBranch, name: 'unstable' },
      { ...baseBranch, name: 'public' },
      { ...baseBranch, name: 'alpha' },
      { ...baseBranch, name: 'b42stable' }
    ];
    const sorted = classifier.sort(classifier.classifyAll(input));
    expect(sorted.map((b) => b.name)).toEqual(['public', 'alpha', 'b42stable', 'unstable']);
  });

  it('throws when instantiated with an empty default branch list', () => {
    expect(() => new BranchClassifier({ defaultBranchNames: [], unstableKeywords: [] })).toThrow();
  });

  const classifyNamed = (classifier: BranchClassifier, name: string): BranchInfo =>
    classifier.classify({ ...baseBranch, name });
});
