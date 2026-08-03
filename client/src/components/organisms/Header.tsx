import './Header.scss';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { BiohazardIcon, LogoutIcon } from '../atoms/Icon.js';
import { Button } from '../atoms/Button.js';
import { ButtonVariant } from '../../types.js';
import { ENV } from '../../config/env.js';

interface HeaderProps {
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogout }) => {
  const { t, i18n } = useTranslation();

  return (
    <header className="portal-header portal-header--spaced">
      <div className="header-top">
        <div className="header-brand">
          <BiohazardIcon />
          <div>
            <h1>{ENV.APP_NAME}</h1>
            <span className="brand-sub">{t('header.subtitle')}</span>
          </div>
        </div>

        <div className="header-actions">
          <div className="language-selector-container">
            <select
              id="language-select"
              className="form-control language-select"
              value={i18n.language.slice(0, 2)}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              aria-label={t('header.languageSelectAria')}
            >
              <option value="es">{t('header.langEs')}</option>
              <option value="en">{t('header.langEn')}</option>
            </select>
          </div>

          <Button variant={ButtonVariant.Logout} onClick={onLogout}>
            <LogoutIcon /> {t('header.logout')}
          </Button>
        </div>
      </div>
    </header>
  );
};
