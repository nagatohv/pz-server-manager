import React, { FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button.js';
import { GuiCard } from '../molecules/GuiCard.js';
import { SearchInput } from '../atoms/SearchInput.js';
import { translateDescription } from '../../utils/translator.js';
import { EditorType, EditorMode, ButtonVariant, type PanelConfig } from '../../types.js';

interface EditorPanelProps {
  editorType: EditorType;
  editorMode: EditorMode;
  parsedConfigData: unknown;
  rawConfigText: string;
  panelConfig?: PanelConfig;
  onPanelConfigChange?: (field: keyof PanelConfig, val: unknown) => void;
  onIniSettingChange?: (key: string, val: string) => void;
  onTypeChange: (type: EditorType) => void;
  onModeChange: (mode: EditorMode) => void;
  onRawTextChange: (text: string) => void;
  onUpdateSandboxValue: (pathStr: string, val: unknown) => void;
  onToggleSpawnRegion: (index: number) => void;
  onRemoveSpawnRegion: (index: number) => void;
  onSave: (e: FormEvent) => void;
  savedMessage: string;
}

const matchesIniItem = (item: { key: string; value: string; description?: string }, search: string): boolean => {
  if (!search) return true;
  const needle = search.toLowerCase();
  return (
    item.key.toLowerCase().includes(needle) ||
    String(item.value).toLowerCase().includes(needle) ||
    (item.description ?? '').toLowerCase().includes(needle)
  );
};

const renderPanelConfigSection = (
  panelConfig: PanelConfig | undefined,
  onPanelConfigChange: ((field: keyof PanelConfig, val: unknown) => void) | undefined,
  t: (key: string, options?: Record<string, unknown>) => string
): React.ReactNode => {
  if (!panelConfig || !onPanelConfigChange) return null;
  return (
    <div className="card-section card-section--panel-config">
      <h4 className="sandbox-category-title">
        {t('editor.panelConfigTitle')}
      </h4>
      <div className="gui-grid">
        <div className="gui-card">
          <div className="gui-card__header">
            <label className="gui-card__title">{t('editor.idleShutdownTitle')}</label>
            <span className="gui-card__type">{t('editor.numericType')}</span>
          </div>
          <input
            type="number"
            min={0}
            className="form-control"
            value={panelConfig.idleShutdownMinutes}
            onChange={(e) => onPanelConfigChange('idleShutdownMinutes', Math.max(0, parseInt(e.target.value, 10) || 0))}
          />
          <p className="gui-card__desc">{t('editor.idleShutdownDesc')}</p>
        </div>

        <div className="gui-card">
          <div className="gui-card__header">
            <label className="gui-card__title">{t('editor.serverLanguageTitle')}</label>
            <span className="gui-card__type">{t('editor.selectType')}</span>
          </div>
          <select
            className="form-control"
            value={panelConfig.serverLanguage}
            onChange={(e) => onPanelConfigChange('serverLanguage', e.target.value)}
          >
            <option value="es">{t('editor.langEs')}</option>
            <option value="en">{t('editor.langEn')}</option>
          </select>
          <p className="gui-card__desc">{t('editor.serverLanguageDesc')}</p>
        </div>
      </div>
    </div>
  );
};

const renderIniEditor = (
  data: unknown,
  onIniSettingChange: ((key: string, val: string) => void) | undefined,
  panelConfig: PanelConfig | undefined,
  onPanelConfigChange: ((field: keyof PanelConfig, val: unknown) => void) | undefined,
  search: string,
  t: (key: string, options?: Record<string, unknown>) => string
): React.ReactNode => {
  const items = (Array.isArray(data) ? data : []) as { key: string; value: string; description?: string }[];
  const filtered = items.filter((item) => matchesIniItem(item, search));
  return (
    <div className="gui-categories">
      {renderPanelConfigSection(panelConfig, onPanelConfigChange, t)}
      <div className="card-section card-section--ini">
        <h4 className="sandbox-category-title">{t('editor.iniCategoryTitle')}</h4>
        {filtered.length === 0 ? (
          <p className="empty-text" data-testid="editor-no-matches">{t('editor.noMatches')}</p>
        ) : (
          <div className="gui-grid">
            {filtered.map((item) => (
              <GuiCard
                key={item.key}
                itemKey={item.key}
                value={item.value}
                onChange={(newVal) => {
                  if (onIniSettingChange) {
                    onIniSettingChange(item.key, String(newVal));
                  }
                }}
                description={translateDescription(item.key, item.description ?? '')}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const renderSandboxEditor = (
  data: unknown,
  onUpdateSandboxValue: (pathStr: string, val: unknown) => void,
  search: string,
  t: (key: string, options?: Record<string, unknown>) => string
): React.ReactNode => {
  const parsed = data as { values?: Record<string, unknown>; optionsMeta?: Record<string, unknown> };
  const valuesObj = parsed?.values ?? {};
  const optionsMeta = parsed?.optionsMeta ?? {};
  const searchLower = search.trim().toLowerCase();
  const visibleCategoryKeys = Object.keys(valuesObj).filter((categoryKey) => {
    if (!searchLower) return true;
    if (categoryKey.toLowerCase().includes(searchLower)) return true;
    const categoryObj = valuesObj[categoryKey] as Record<string, unknown>;
    if (!categoryObj || typeof categoryObj !== 'object') return false;
    return Object.keys(categoryObj).some((fieldKey) => fieldKey.toLowerCase().includes(searchLower));
  });
  const totalMatches = visibleCategoryKeys.length;

  return (
    <div className="gui-categories" data-testid="sandbox-categories">
      {totalMatches === 0 ? (
        <p className="empty-text" data-testid="editor-no-matches">{t('editor.noMatches')}</p>
      ) : visibleCategoryKeys.map((categoryKey) => {
        const categoryObj = valuesObj[categoryKey] as Record<string, unknown>;
        if (typeof categoryObj !== 'object' || categoryObj === null) return null;

        const visibleFieldKeys = Object.keys(categoryObj).filter((fieldKey) =>
          !searchLower || fieldKey.toLowerCase().includes(searchLower) || categoryKey.toLowerCase().includes(searchLower)
        );

        return (
          <div key={categoryKey} className="card-section card-section--sandbox">
            <h4 className="sandbox-category-title">
              {t('editor.categoryLabel', { category: categoryKey })}
            </h4>
            <div className="gui-grid">
              {visibleFieldKeys.map((fieldKey) => {
                const fullPath = `${categoryKey}.${fieldKey}`;
                const val = categoryObj[fieldKey];
                const meta = (optionsMeta as Record<string, unknown>)[fullPath] ?? {};

                return (
                  <GuiCard
                    key={fullPath}
                    itemKey={fieldKey}
                    value={val}
                    onChange={(newVal) => onUpdateSandboxValue(fullPath, newVal)}
                    description={
                      (meta as { translatedDesc?: string; description?: string }).translatedDesc ||
                      (meta as { description?: string }).description ||
                      ''
                    }
                    boundedOption={meta as any}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const renderSpawnEditor = (
  data: unknown,
  onToggleSpawnRegion: (i: number) => void,
  onRemoveSpawnRegion: (i: number) => void,
  t: (key: string, options?: Record<string, unknown>) => string
): React.ReactNode => {
  const regions = Array.isArray(data) ? data : [];
  return (
    <div className="spawn-grid">
      {regions.map((reg, idx) => (
        <div key={idx} className="spawn-card">
          <div className="spawn-info">
            <strong>{reg.name}</strong>
            <span className="spawn-file">{reg.file}</span>
          </div>
          <div className="spawn-actions">
            <Button
              variant={ButtonVariant.Toggle}
              active={reg.enabled}
              onClick={() => onToggleSpawnRegion(idx)}
            >
              {reg.enabled ? t('editor.spawnEnabled') : t('editor.spawnDisabled')}
            </Button>
            <Button variant={ButtonVariant.Danger} onClick={() => onRemoveSpawnRegion(idx)}>
              {t('editor.spawnDelete')}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export const EditorPanel: React.FC<EditorPanelProps> = ({
  editorType,
  editorMode,
  parsedConfigData,
  rawConfigText,
  panelConfig,
  onPanelConfigChange,
  onIniSettingChange,
  onTypeChange,
  onModeChange,
  onRawTextChange,
  onUpdateSandboxValue,
  onToggleSpawnRegion,
  onRemoveSpawnRegion,
  onSave,
  savedMessage
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const searchPlaceholder = useMemo(
    () => editorType === EditorType.Sandbox
      ? t('editor.searchCategoryPlaceholder')
      : t('editor.searchSettingPlaceholder'),
    [editorType, t]
  );

  const getTabLabel = (type: EditorType): string => {
    if (type === EditorType.Ini) return t('editor.tabIni');
    if (type === EditorType.Sandbox) return t('editor.tabSandbox');
    if (type === EditorType.Spawn) return t('editor.tabSpawn');
    return type;
  };

  const renderGuiEditor = (): React.ReactNode => {
    if (!parsedConfigData) {
      return <p className="empty-text">{t('editor.loadingText')}</p>;
    }
    if (editorType === EditorType.Ini) {
      return renderIniEditor(parsedConfigData, onIniSettingChange, panelConfig, onPanelConfigChange, search, t);
    }
    if (editorType === EditorType.Sandbox) {
      return renderSandboxEditor(parsedConfigData, onUpdateSandboxValue, search, t);
    }
    if (editorType === EditorType.Spawn) {
      return renderSpawnEditor(parsedConfigData, onToggleSpawnRegion, onRemoveSpawnRegion, t);
    }
    return null;
  };

  const saveBtnText = t('editor.saveBtnTemplate', { type: editorType.toUpperCase() });

  return (
    <div className="tab-content">
      <div className="editor-controls-bar">
        <div className="editor-type-selector">
          {([EditorType.Ini, EditorType.Sandbox, EditorType.Spawn] as const).map((type) => (
            <Button
              key={type}
              variant={ButtonVariant.EditorSelect}
              active={editorType === type}
              onClick={() => {
                setSearch('');
                onTypeChange(type);
              }}
            >
              {getTabLabel(type)}
            </Button>
          ))}
        </div>

        <div className="editor-mode-toggle">
          <Button
            variant={ButtonVariant.Toggle}
            active={editorMode === EditorMode.Gui}
            onClick={() => onModeChange(EditorMode.Gui)}
          >
            {t('editor.modeGui')}
          </Button>
          <Button
            variant={ButtonVariant.Toggle}
            active={editorMode === EditorMode.Raw}
            onClick={() => onModeChange(EditorMode.Raw)}
          >
            {t('editor.modeRaw')}
          </Button>
        </div>
      </div>

      <form onSubmit={onSave} className="editor-form">
        {savedMessage && <div className="alert alert-success">{savedMessage}</div>}

        {editorMode === EditorMode.Gui && editorType !== EditorType.Spawn && (
          <div className="filters-bar" role="search">
            <div className="filters-bar__search">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
              />
            </div>
            {search && (
              <button
                type="button"
                className="filters-bar__clear"
                onClick={() => setSearch('')}
              >
                {t('servers.clearFilters')}
              </button>
            )}
          </div>
        )}

        {editorMode === EditorMode.Gui ? (
          renderGuiEditor()
        ) : (
          <div className="form-group">
            <textarea
              className="form-control text-editor"
              rows={22}
              value={rawConfigText}
              onChange={(e) => onRawTextChange(e.target.value)}
            />
          </div>
        )}

        <div className="form-actions form-actions--top-margin">
          <Button type="submit" variant={ButtonVariant.Primary}>
            {saveBtnText}
          </Button>
        </div>
      </form>
    </div>
  );
};
