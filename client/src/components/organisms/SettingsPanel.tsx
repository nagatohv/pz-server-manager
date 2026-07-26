import React, { FormEvent } from 'react';
import { GuiCard } from '../molecules/GuiCard.js';
import { Button } from '../atoms/Button.js';
import { translateDescription } from '../../utils/translator.js';
import { CLIENT_STRINGS } from '../../config/strings.js';
import { IniSettingItem, PanelConfig, ButtonVariant } from '../../types.js';

interface SettingsPanelProps {
  iniSettings: IniSettingItem[];
  panelConfig: PanelConfig;
  onIniSettingChange: (key: string, val: string) => void;
  onPanelConfigChange: (field: keyof PanelConfig, val: unknown) => void;
  onSave: (e: FormEvent) => void;
  savedMessage: string;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  iniSettings,
  panelConfig,
  onIniSettingChange,
  onPanelConfigChange,
  onSave,
  savedMessage
}) => {
  const languageOptions = Object.entries(CLIENT_STRINGS.SETTINGS_PANEL.LANGUAGES).map(
    ([code, label]) => ({ value: code, label })
  );

  return (
    <div className="tab-content">
      <form onSubmit={onSave}>
        {savedMessage && <div className="alert alert-success">{savedMessage}</div>}

        <div className="card-section">
          <h3>{CLIENT_STRINGS.SETTINGS_PANEL.GENERAL_SECTION_TITLE}</h3>
          <div className="gui-grid">
            <GuiCard
              itemKey={CLIENT_STRINGS.SETTINGS_PANEL.IDLE_SHUTDOWN_LABEL}
              value={panelConfig.idleShutdownMinutes}
              onChange={(val) => onPanelConfigChange('idleShutdownMinutes', val)}
              description={CLIENT_STRINGS.SETTINGS_PANEL.IDLE_SHUTDOWN_DESC}
            />

            <GuiCard
              itemKey={CLIENT_STRINGS.SETTINGS_PANEL.SERVER_LANG_LABEL}
              value={panelConfig.serverLanguage}
              onChange={(val) => onPanelConfigChange('serverLanguage', val)}
              description={CLIENT_STRINGS.SETTINGS_PANEL.SERVER_LANG_DESC}
              boundedOption={{ options: languageOptions }}
            />
          </div>
        </div>

        <div className="card-section card-section--top-margin">
          <h3>{CLIENT_STRINGS.SETTINGS_PANEL.SERVER_INI_TITLE}</h3>
          <div className="gui-grid">
            {iniSettings.map((item) => (
              <GuiCard
                key={item.key}
                itemKey={item.key}
                value={item.value}
                onChange={(newVal) => onIniSettingChange(item.key, String(newVal))}
                description={translateDescription(item.key, item.description)}
              />
            ))}
          </div>
        </div>

        <div className="form-actions form-actions--top-margin">
          <Button type="submit" variant={ButtonVariant.Primary}>
            {CLIENT_STRINGS.SETTINGS_PANEL.SAVE_SETTINGS_BTN}
          </Button>
        </div>
      </form>
    </div>
  );
};
