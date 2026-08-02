import React, { FormEvent } from 'react';
import { Button } from '../atoms/Button.js';
import { GuiCard } from '../molecules/GuiCard.js';
import { translateDescription } from '../../utils/translator.js';
import { CLIENT_STRINGS } from '../../config/strings.js';
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

const renderPanelConfigSection = (
  panelConfig?: PanelConfig,
  onPanelConfigChange?: (field: keyof PanelConfig, val: unknown) => void
): React.ReactNode => {
  if (!panelConfig || !onPanelConfigChange) return null;
  return (
    <div className="card-section card-section--panel-config">
      <h4 className="sandbox-category-title">
        Inactividad y Opciones de Portal
      </h4>
      <div className="gui-grid">
        <div className="gui-card">
          <div className="gui-card__header">
            <label className="gui-card__title">Apagado por Inactividad (minutos)</label>
            <span className="gui-card__type">NUMÉRICO</span>
          </div>
          <input
            type="number"
            min={0}
            className="form-control"
            value={panelConfig.idleShutdownMinutes}
            onChange={(e) => onPanelConfigChange('idleShutdownMinutes', Math.max(0, parseInt(e.target.value, 10) || 0))}
          />
          <p className="gui-card__desc">0 = Apagado por inactividad desactivado</p>
        </div>

        <div className="gui-card">
          <div className="gui-card__header">
            <label className="gui-card__title">Idioma del Servidor</label>
            <span className="gui-card__type">SELECCIÓN</span>
          </div>
          <select
            className="form-control"
            value={panelConfig.serverLanguage}
            onChange={(e) => onPanelConfigChange('serverLanguage', e.target.value)}
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
          <p className="gui-card__desc">Idioma para notificaciones e interfaz</p>
        </div>
      </div>
    </div>
  );
};

const renderIniEditor = (
  data: unknown,
  onIniSettingChange?: (key: string, val: string) => void,
  panelConfig?: PanelConfig,
  onPanelConfigChange?: (field: keyof PanelConfig, val: unknown) => void
): React.ReactNode => {
  const items = Array.isArray(data) ? data : [];
  return (
    <div className="gui-categories">
      {renderPanelConfigSection(panelConfig, onPanelConfigChange)}
      <div className="card-section card-section--ini">
        <h4 className="sandbox-category-title">
          Parámetros Directos (server.ini)
        </h4>
        <div className="gui-grid">
          {items.map((item) => (
            <GuiCard
              key={item.key}
              itemKey={item.key}
              value={item.value}
              onChange={(newVal) => {
                if (onIniSettingChange) {
                  onIniSettingChange(item.key, String(newVal));
                }
              }}
              description={translateDescription(item.key, item.description)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const renderSandboxEditor = (
  data: unknown,
  onUpdateSandboxValue: (pathStr: string, val: unknown) => void
): React.ReactNode => {
  const parsed = data as { values?: Record<string, unknown>; optionsMeta?: Record<string, unknown> };
  const valuesObj = parsed?.values ?? {};
  const optionsMeta = parsed?.optionsMeta ?? {};

  return (
    <div className="gui-categories">
      {Object.keys(valuesObj).map((categoryKey) => {
        const categoryObj = valuesObj[categoryKey] as Record<string, unknown>;
        if (typeof categoryObj !== 'object' || categoryObj === null) return null;

        return (
          <div key={categoryKey} className="card-section card-section--sandbox">
            <h4 className="sandbox-category-title">
              {CLIENT_STRINGS.EDITOR_PANEL.CATEGORY_PREFIX}{categoryKey}
            </h4>
            <div className="gui-grid">
              {Object.keys(categoryObj).map((fieldKey) => {
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
  onRemoveSpawnRegion: (i: number) => void
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
              {reg.enabled ? CLIENT_STRINGS.EDITOR_PANEL.SPAWN_ENABLED : CLIENT_STRINGS.EDITOR_PANEL.SPAWN_DISABLED}
            </Button>
            <Button variant={ButtonVariant.Danger} onClick={() => onRemoveSpawnRegion(idx)}>
              {CLIENT_STRINGS.EDITOR_PANEL.SPAWN_DELETE}
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
  const renderGuiEditor = (): React.ReactNode => {
    if (!parsedConfigData) {
      return <p className="empty-text">{CLIENT_STRINGS.EDITOR_PANEL.LOADING_TEXT}</p>;
    }
    if (editorType === EditorType.Ini) return renderIniEditor(parsedConfigData, onIniSettingChange, panelConfig, onPanelConfigChange);
    if (editorType === EditorType.Sandbox) return renderSandboxEditor(parsedConfigData, onUpdateSandboxValue);
    if (editorType === EditorType.Spawn) return renderSpawnEditor(parsedConfigData, onToggleSpawnRegion, onRemoveSpawnRegion);
    return null;
  };

  const saveBtnText = CLIENT_STRINGS.EDITOR_PANEL.SAVE_BTN_TEMPLATE.replace(
    '{type}',
    editorType.toUpperCase()
  );

  return (
    <div className="tab-content">
      <div className="editor-controls-bar">
        <div className="editor-type-selector">
          {([EditorType.Ini, EditorType.Sandbox, EditorType.Spawn] as const).map((type) => (
            <Button
              key={type}
              variant={ButtonVariant.EditorSelect}
              active={editorType === type}
              onClick={() => onTypeChange(type)}
            >
              {CLIENT_STRINGS.EDITOR_PANEL[`TAB_${type.toUpperCase()}` as keyof typeof CLIENT_STRINGS.EDITOR_PANEL]}
            </Button>
          ))}
        </div>

        <div className="editor-mode-toggle">
          <Button
            variant={ButtonVariant.Toggle}
            active={editorMode === EditorMode.Gui}
            onClick={() => onModeChange(EditorMode.Gui)}
          >
            {CLIENT_STRINGS.EDITOR_PANEL.MODE_GUI}
          </Button>
          <Button
            variant={ButtonVariant.Toggle}
            active={editorMode === EditorMode.Raw}
            onClick={() => onModeChange(EditorMode.Raw)}
          >
            {CLIENT_STRINGS.EDITOR_PANEL.MODE_RAW}
          </Button>
        </div>
      </div>

      <form onSubmit={onSave} className="editor-form">
        {savedMessage && <div className="alert alert-success">{savedMessage}</div>}

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
