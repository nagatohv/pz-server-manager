import React, { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { GuiCard } from '../molecules/GuiCard.js';
import { Button } from '../atoms/Button.js';
import { translateDescription } from '../../utils/translator.js';
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
  const { t } = useTranslation();

  const languageOptions = Object.entries(t('settings.languages', { returnObjects: true }) as Record<string, string>).map(
    ([code, label]) => ({ value: code, label })
  );

  return (
    <div className="tab-content">
      <form onSubmit={onSave}>
        {savedMessage && <div className="alert alert-success">{savedMessage}</div>}

        <div className="card-section">
          <h3>{t('settings.generalSectionTitle')}</h3>
          <div className="gui-grid">
            <GuiCard
              itemKey={t('settings.idleShutdownLabel')}
              value={panelConfig.idleShutdownMinutes}
              onChange={(val) => onPanelConfigChange('idleShutdownMinutes', val)}
              description={t('settings.idleShutdownDesc')}
            />

            <GuiCard
              itemKey={t('settings.serverLangLabel')}
              value={panelConfig.serverLanguage}
              onChange={(val) => onPanelConfigChange('serverLanguage', val)}
              description={t('settings.serverLangDesc')}
              boundedOption={{ options: languageOptions }}
            />
          </div>
        </div>

        <div className="card-section card-section--top-margin">
          <h3>{t('settings.serverIniTitle')}</h3>
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
            {t('settings.saveSettingsBtn')}
          </Button>
        </div>
      </form>
    </div>
  );
};
