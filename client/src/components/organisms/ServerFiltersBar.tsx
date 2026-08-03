import React from 'react';
import { useTranslation } from 'react-i18next';
import { SearchInput } from '../atoms/SearchInput.js';
import { ServerStatus, type PzInstance, type BranchInfo } from '../../types.js';

export type InstallFilter = 'all' | 'installed' | 'notInstalled';
export type ActivityFilter = 'all' | 'active' | 'inactive';
export type SortBy = 'nameAsc' | 'nameDesc' | 'createdDesc' | 'createdAsc' | 'updatedDesc';

export interface ServerFiltersValue {
  search: string;
  installFilter: InstallFilter;
  activityFilter: ActivityFilter;
  branchFilter: string;
  sortBy: SortBy;
}

export const DEFAULT_SERVER_FILTERS: ServerFiltersValue = {
  search: '',
  installFilter: 'all',
  activityFilter: 'all',
  branchFilter: 'all',
  sortBy: 'createdDesc'
};

interface ServerFiltersBarProps {
  value: ServerFiltersValue;
  onChange: (next: ServerFiltersValue) => void;
  branches: BranchInfo[];
  resultsCount: number;
  totalCount: number;
}

export const ServerFiltersBar: React.FC<ServerFiltersBarProps> = ({
  value,
  onChange,
  branches,
  resultsCount,
  totalCount
}) => {
  const { t } = useTranslation();

  const update = <K extends keyof ServerFiltersValue>(key: K, nextValue: ServerFiltersValue[K]) =>
    onChange({ ...value, [key]: nextValue });

  const resetFilters = () => onChange(DEFAULT_SERVER_FILTERS);

  const hasActiveFilters =
    value.search !== '' ||
    value.installFilter !== 'all' ||
    value.activityFilter !== 'all' ||
    value.branchFilter !== 'all';

  const branchOptions = branches
    .map((b) => ({ value: b.name || 'public', label: b.name || t('servers.publicBranch') }))
    .filter((opt, index, self) => self.findIndex((o) => o.value === opt.value) === index)
    .sort((a, b) => a.label.localeCompare(b.label));

  const isFiltered = resultsCount !== totalCount;

  return (
    <div className="filters-bar" role="search" aria-label={t('servers.filtersTitle')}>
      <div className="filters-bar__search">
        <SearchInput
          value={value.search}
          onChange={(next) => update('search', next)}
          placeholder={t('servers.searchPlaceholder')}
          aria-label={t('servers.searchPlaceholder')}
        />
      </div>

      <div className="filters-bar__group">
        <span className="filters-bar__label">{t('servers.filterAll')}</span>
        <select
          className="filters-bar__select"
          value={value.installFilter}
          onChange={(e) => update('installFilter', e.target.value as InstallFilter)}
          aria-label={t('servers.filterAll')}
        >
          <option value="all">{t('servers.filterAll')}</option>
          <option value="installed">{t('servers.filterInstalled')}</option>
          <option value="notInstalled">{t('servers.filterNotInstalled')}</option>
        </select>
      </div>

      <div className="filters-bar__group">
        <select
          className="filters-bar__select"
          value={value.activityFilter}
          onChange={(e) => update('activityFilter', e.target.value as ActivityFilter)}
          aria-label={t('servers.filterActiveOnly')}
        >
          <option value="all">{t('servers.filterAll')}</option>
          <option value="active">{t('servers.filterActiveOnly')}</option>
          <option value="inactive">{t('servers.filterInactiveOnly')}</option>
        </select>
      </div>

      <div className="filters-bar__group">
        <select
          className="filters-bar__select"
          value={value.branchFilter}
          onChange={(e) => update('branchFilter', e.target.value)}
          aria-label={t('servers.filterBranchAll')}
        >
          <option value="all">{t('servers.filterBranchAll')}</option>
          {branchOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="filters-bar__group">
        <span className="filters-bar__label">{t('servers.sortBy')}</span>
        <select
          className="filters-bar__select"
          value={value.sortBy}
          onChange={(e) => update('sortBy', e.target.value as SortBy)}
          aria-label={t('servers.sortBy')}
        >
          <option value="nameAsc">{t('servers.sortNameAsc')}</option>
          <option value="nameDesc">{t('servers.sortNameDesc')}</option>
          <option value="createdDesc">{t('servers.sortCreatedDesc')}</option>
          <option value="createdAsc">{t('servers.sortCreatedAsc')}</option>
          <option value="updatedDesc">{t('servers.sortUpdatedDesc')}</option>
        </select>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          className="filters-bar__clear"
          onClick={resetFilters}
        >
          {t('servers.clearFilters')}
        </button>
      )}

      <span className="filters-bar__results" aria-live="polite">
        {isFiltered
          ? t('servers.resultsCount', { count: resultsCount })
          : null}
      </span>
    </div>
  );
};

export const filterAndSortInstances = (
  instances: PzInstance[],
  filters: ServerFiltersValue,
  activeId: string | null
): PzInstance[] => {
  const search = filters.search.trim().toLowerCase();

  const filtered = instances.filter((instance) => {
    if (search && !instance.name.toLowerCase().includes(search)) return false;

    if (filters.installFilter === 'installed' && !instance.installed) return false;
    if (filters.installFilter === 'notInstalled' && instance.installed) return false;

    if (filters.activityFilter === 'active' && instance.id !== activeId) return false;
    if (filters.activityFilter === 'inactive' && instance.id === activeId) return false;

    if (filters.branchFilter !== 'all') {
      const instanceBranch = instance.branch || 'public';
      if (instanceBranch !== filters.branchFilter) return false;
    }

    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (filters.sortBy) {
      case 'nameAsc':
        return a.name.localeCompare(b.name);
      case 'nameDesc':
        return b.name.localeCompare(a.name);
      case 'createdAsc':
        return a.createdAt - b.createdAt;
      case 'updatedDesc':
        return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
      case 'createdDesc':
      default:
        return b.createdAt - a.createdAt;
    }
  });

  return sorted;
};
